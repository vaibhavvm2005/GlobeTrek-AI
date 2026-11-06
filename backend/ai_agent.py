import os
import re
import json
import uuid
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from database import get_db, utcnow
from adapters import fetch_weather

def search_experiences(query: str = "", city: str = "", category: str = "", max_budget: Optional[float] = None) -> List[Dict[str, Any]]:
    sql = """
    SELECT e.id, e.title, e.city, e.price, e.rating, e.image, e.date_str, e.start_time,
           e.description, c.name as category_name
    FROM events e
    JOIN categories c ON c.id = e.category_id
    WHERE e.is_published = 1
    """
    args = []
    if city:
        sql += " AND LOWER(e.city) LIKE ?"
        args.append(f"%{city.lower().strip()}%")
    if category:
        sql += " AND (LOWER(c.name) LIKE ? OR LOWER(e.category_id) LIKE ?)"
        args.extend([f"%{category.lower().strip()}%", f"%{category.lower().strip()}%"])
    if max_budget is not None:
        sql += " AND e.price <= ?"
        args.append(float(max_budget))
    if query:
        sql += " AND (LOWER(e.title) LIKE ? OR LOWER(e.description) LIKE ? OR LOWER(e.city) LIKE ?)"
        term = f"%{query.lower().strip()}%"
        args.extend([term, term, term])

    sql += " ORDER BY e.rating DESC, e.price ASC LIMIT 8"

    with get_db() as conn:
        rows = conn.execute(sql, args).fetchall()
        return [dict(r) for r in rows]

def check_ticket_inventory(event_id: int, quantity: int = 1) -> Dict[str, Any]:
    with get_db() as conn:
        ev = conn.execute("SELECT id, title, price, inventory FROM events WHERE id = ?", (event_id,)).fetchone()
        if not ev:
            return {"available": False, "error": f"Event #{event_id} does not exist"}
        
        types = conn.execute("""
        SELECT tt.id, tt.name, tt.price, inv.available_quantity
        FROM ticket_types tt
        JOIN inventory inv ON inv.ticket_type_id = tt.id
        WHERE tt.event_id = ?
        """, (event_id,)).fetchall()
        
        has_stock = ev["inventory"] >= quantity
        return {
            "event_id": event_id,
            "title": ev["title"],
            "requested_quantity": quantity,
            "available": has_stock,
            "overall_available": ev["inventory"],
            "ticket_tiers": [dict(t) for t in types]
        }

def calculate_booking_quote(event_id: int, quantity: int = 1) -> Dict[str, Any]:
    with get_db() as conn:
        ev = conn.execute("SELECT id, title, price FROM events WHERE id = ?", (event_id,)).fetchone()
        if not ev:
            return {"error": "Event not found"}
        subtotal = ev["price"] * quantity
        fee = 59 if subtotal > 0 else 0
        return {
            "event_id": event_id,
            "title": ev["title"],
            "quantity": quantity,
            "unit_price": ev["price"],
            "subtotal": subtotal,
            "taxes_fees": fee,
            "total_amount": subtotal + fee,
            "currency": "INR"
        }

def retrieve_user_bookings(reference_or_email: str) -> List[Dict[str, Any]]:
    val = reference_or_email.strip().upper()
    with get_db() as conn:
        if val.startswith("WF-"):
            rows = conn.execute("""
            SELECT b.id, b.status, b.total_amount, b.created_at, e.title as event_title, e.city, e.date_str
            FROM bookings b
            JOIN events e ON e.id = b.event_id
            WHERE b.id = ?
            """, (val,)).fetchall()
        else:
            rows = conn.execute("""
            SELECT b.id, b.status, b.total_amount, b.created_at, e.title as event_title, e.city, e.date_str
            FROM bookings b
            JOIN events e ON e.id = b.event_id
            WHERE LOWER(b.customer_email) = ?
            ORDER BY b.created_at DESC LIMIT 5
            """, (val.lower(),)).fetchall()
        return [dict(r) for r in rows]

def generate_smart_itinerary(destination: str, days: int = 2) -> Dict[str, Any]:
    city = destination.strip().title()
    events = search_experiences(city=city)
    if not events:
        events = search_experiences(city="Bengaluru")
        city = "Bengaluru"

    itinerary_days = []
    for day_idx in range(1, min(days, 3) + 1):
        slot1 = events[(day_idx * 2 - 2) % len(events)]
        slot2 = events[(day_idx * 2 - 1) % len(events)]
        itinerary_days.append({
            "day": day_idx,
            "theme": f"Day {day_idx}: Heritage & Living Culture in {city}",
            "morning": {
                "time": "09:30 AM",
                "activity": slot1["title"],
                "price": slot1["price"],
                "category": slot1["category_name"]
            },
            "afternoon": {
                "time": "02:30 PM",
                "activity": "Traditional Lunch & Local Artisan Street Walk",
                "price": 0,
                "category": "Culinary & Walk"
            },
            "evening": {
                "time": "06:00 PM",
                "activity": slot2["title"],
                "price": slot2["price"],
                "category": slot2["category_name"]
            }
        })
    return {
        "destination": city,
        "total_days": days,
        "estimated_tickets_cost": sum(d["morning"]["price"] + d["evening"]["price"] for d in itinerary_days),
        "days": itinerary_days
    }

TOOLS_REGISTRY = {
    "search_experiences": search_experiences,
    "check_ticket_inventory": check_ticket_inventory,
    "calculate_booking_quote": calculate_booking_quote,
    "retrieve_user_bookings": retrieve_user_bookings,
    "generate_smart_itinerary": generate_smart_itinerary
}

def deterministic_concierge(message: str, language: str = "en") -> Tuple[str, List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    text = message.lower().strip()
    tools_executed = []
    interactive_card = None

    # Budget extraction
    budget_match = re.search(r"(?:under|below|less than|within|₹)\s*(\d+)", text)
    budget = float(budget_match.group(1)) if budget_match else None

    # City extraction
    cities = ["bengaluru", "mumbai", "hampi", "mysuru", "coorg", "pune", "hyderabad", "delhi"]
    found_city = next((c for c in cities if c in text), "")

    # Category extraction
    cat_map = {
        "museum": "Museums",
        "concert": "Concerts",
        "music": "Concerts",
        "trek": "Adventures",
        "adventure": "Adventures",
        "exhibition": "Exhibitions",
        "college": "College Programs",
        "hackathon": "College Programs",
        "culture": "Cultural Programs",
        "palace": "Tourist Attractions",
        "attraction": "Tourist Attractions"
    }
    found_category = next((cat_map[k] for k in cat_map if k in text), "")

    # 1. Booking retrieval inquiry
    wf_code_match = re.search(r"WF-[A-Z0-9]{6}", message.upper())
    if wf_code_match or any(w in text for w in ["my booking", "my ticket", "retrieve ticket", "show bookings", "booking status"]):
        ref = wf_code_match.group(0) if wf_code_match else "customer@wayfarer.com"
        results = retrieve_user_bookings(ref)
        tools_executed.append({"tool": "retrieve_user_bookings", "args": {"reference": ref}, "count": len(results)})
        if results:
            first = results[0]
            interactive_card = {"type": "booking_summary", "data": first}
            if language == "hi":
                reply = f"मुझे आपकी बुकिंग #{first['id']} मिल गई है! स्थिति: {first['status']}। आयोजन: {first['event_title']}। आप इसे 'My Tickets' में कभी भी ऑफलाइन देख सकते हैं।"
            elif language == "kn":
                reply = f"ನಿಮ್ಮ ಬುಕಿಂಗ್ #{first['id']} ಲಭ್ಯವಿದೆ! ಸ್ಥಿತಿ: {first['status']}. ಕಾರ್ಯಕ್ರಮ: {first['event_title']}. ನೀವು ಇದನ್ನು 'My Tickets' ನಲ್ಲಿ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿಯೂ ನೋಡಬಹುದು."
            else:
                reply = f"Found your booking reference #{first['id']}! Status: {first['status']} for '{first['event_title']}' in {first['city']}. You can download the signed digital pass anytime from your ticket wallet."
            return reply, tools_executed, interactive_card
        else:
            reply = "No bookings found for that reference. You can browse curated experiences to make your first reservation!"
            return reply, tools_executed, None

    # 2. Itinerary request
    if any(w in text for w in ["itinerary", "plan", "trip", "weekend plan", "day plan"]):
        days = 2
        if "3 day" in text or "three day" in text:
            days = 3
        elif "1 day" in text or "one day" in text:
            days = 1
        itin = generate_smart_itinerary(found_city or "Bengaluru", days)
        tools_executed.append({"tool": "generate_smart_itinerary", "args": {"destination": itin["destination"], "days": days}})
        interactive_card = {"type": "itinerary_suggestion", "data": itin}
        if language == "hi":
            reply = f"मैंने {itin['destination']} के लिए {days}-दिवसीय यात्रा कार्यक्रम तैयार किया है! कुल अनुमानित टिकट मूल्य लगभग ₹{itin['estimated_tickets_cost']} है।"
        elif language == "kn":
            reply = f"ನಾನು {itin['destination']} ಗಾಗಿ {days}-ದಿನಗಳ ಪ್ರವಾಸ ಯೋಜನೆಯನ್ನು ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ! ಅಂದಾಜು ಟಿಕೆಟ್ ಮೊತ್ತ ₹{itin['estimated_tickets_cost']}."
        else:
            reply = f"I have curated a thoughtful {days}-day itinerary for {itin['destination']}. Total verified ticket cost is approximately ₹{itin['estimated_tickets_cost']}. Review the day-by-day plan below:"
        return reply, tools_executed, interactive_card

    # 3. Discovery & Filtered Search
    events = search_experiences(
        query=text if not (found_city or found_category or budget) else "",
        city=found_city,
        category=found_category,
        max_budget=budget
    )
    tools_executed.append({
        "tool": "search_experiences",
        "args": {"city": found_city, "category": found_category, "budget": budget},
        "count": len(events)
    })

    if events:
        top = events[0]
        inv = check_ticket_inventory(top["id"], 2)
        quote = calculate_booking_quote(top["id"], 2)
        tools_executed.append({"tool": "check_ticket_inventory", "args": {"event_id": top["id"], "quantity": 2}})
        tools_executed.append({"tool": "calculate_booking_quote", "args": {"event_id": top["id"], "quantity": 2}})
        
        interactive_card = {
            "type": "experience_recommendation",
            "experience": top,
            "availability": inv["overall_available"],
            "quote": quote
        }

        if language == "hi":
            reply = f"मुझे {top['city']} में '{top['title']}' मिला है, जिसका टिकट केवल ₹{top['price']} से शुरू होता है। वास्तविक इन्वेंट्री में {inv['overall_available']} स्थान उपलब्ध हैं। 2 टिकटों के लिए कुल राशि ₹{quote['total_amount']} (कर व शुल्क सहित) होगी। क्या आप इसे बुक करना चाहेंगे?"
        elif language == "kn":
            reply = f"{top['city']} ನಲ್ಲಿ '{top['title']}' ಲಭ್ಯವಿದೆ, ಟಿಕೆಟ್ ಬೆಲೆ ₹{top['price']} ರಿಂದ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಪ್ರಸ್ತುತ {inv['overall_available']} ಸ್ಥಾನಗಳು ಲಭ್ಯವಿವೆ. 2 ಟಿಕೆಟ್‌ಗಳಿಗೆ ಒಟ್ಟು ಮೊತ್ತ ₹{quote['total_amount']} (ತೆರಿಗೆ ಸೇರಿದಂತೆ). ನೀವು ಬುಕಿಂಗ್ ಮುಂದುವರಿಸಲು ಬಯಸುವಿರಾ?"
        else:
            reply = f"I found '{top['title']}' in {top['city']} starting at ₹{top['price']}. There are currently {inv['overall_available']} verified places available in the database. A booking for 2 visitors comes to ₹{quote['total_amount']} including taxes and booking fees. Would you like to proceed with reservation?"
        return reply, tools_executed, interactive_card

    # Fallback welcoming prompt
    if language == "hi":
        reply = "नमस्ते! मैं WAYFARER AI सहायक हूँ। आप किस शहर (बेंगलुरु, मुंबई, हम्पी आदि), श्रेणी या बजट में अनुभव खोजना चाहते हैं?"
    elif language == "kn":
        reply = "ನಮಸ್ಕಾರ! ನಾನು WAYFARER AI ಸಹಾಯಕ. ನೀವು ಯಾವ ನಗರ (ಬೆಂಗಳೂರು, ಮುಂಬೈ, ಹಂಪಿ ಇತ್ಯಾದಿ), ಅನುಭವ ಅಥವಾ ಬಜೆಟ್‌ನಲ್ಲಿ ಟಿಕೆಟ್ ಹುಡುಕುತ್ತಿದ್ದೀರಿ?"
    else:
        reply = "Welcome to WAYFARER AI Concierge! Tell me your destination (e.g. Bengaluru, Hampi, Mumbai), preferred date, budget, or experience type (museums, live concerts, treks), and I will retrieve real-time availability from our database."

    return reply, tools_executed, None

def run_gemini_agent(message: str, history: List[Dict[str, str]], language: str = "en") -> Tuple[str, List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return deterministic_concierge(message, language)

    # Function declarations for Gemini
    declarations = [
        {
            "name": "search_experiences",
            "description": "Search available museums, concerts, treks, and exhibitions from authoritative database",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "query": {"type": "STRING", "description": "Free text query or title"},
                    "city": {"type": "STRING", "description": "City name like Bengaluru, Mumbai, Hampi"},
                    "category": {"type": "STRING", "description": "Category like Museums, Concerts, Adventures"},
                    "max_budget": {"type": "NUMBER", "description": "Maximum ticket price in INR"}
                }
            }
        },
        {
            "name": "check_ticket_inventory",
            "description": "Check real database inventory count for an event",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "event_id": {"type": "INTEGER", "description": "ID of the event"},
                    "quantity": {"type": "INTEGER", "description": "Number of tickets"}
                },
                "required": ["event_id"]
            }
        },
        {
            "name": "calculate_booking_quote",
            "description": "Calculate exact price quote including taxes and fees",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "event_id": {"type": "INTEGER", "description": "ID of the event"},
                    "quantity": {"type": "INTEGER", "description": "Number of tickets"}
                },
                "required": ["event_id"]
            }
        },
        {
            "name": "retrieve_user_bookings",
            "description": "Retrieve booking status or digital pass by booking reference code or email",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "reference_or_email": {"type": "STRING", "description": "Booking reference (e.g. WF-7A8B9C) or customer email"}
                },
                "required": ["reference_or_email"]
            }
        },
        {
            "name": "generate_smart_itinerary",
            "description": "Generate a curated day-by-day travel itinerary with verified activities",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "destination": {"type": "STRING", "description": "City or destination"},
                    "days": {"type": "INTEGER", "description": "Number of days (1-3)"}
                },
                "required": ["destination"]
            }
        }
    ]

    system_instruction = f"""
    You are WAYFARER's official AI Travel Concierge.
    Respond in language: {language} (English, Hindi, or Kannada as requested).
    Never fabricate ticket availability, booking reference codes, or pricing.
    Always execute available tools to fetch factual data.
    Be warm, helpful, culturally informed, and concise.
    """

    contents = []
    for h in history[-8:]:
        role = "user" if h.get("role") == "user" else "model"
        contents.append({"role": role, "parts": [{"text": h.get("content", "")}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    tools_used = []
    interactive_card = None

    try:
        with httpx.Client(timeout=15.0) as client:
            for _ in range(4):
                payload = {
                    "system_instruction": {"parts": [{"text": system_instruction}]},
                    "contents": contents,
                    "tools": [{"function_declarations": declarations}]
                }
                resp = client.post(url, headers={"x-goog-api-key": api_key}, json=payload)
                resp.raise_for_status()
                data = resp.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    break
                parts = candidates[0].get("content", {}).get("parts", [])
                fn_call = next((p.get("functionCall") for p in parts if "functionCall" in p), None)
                if fn_call:
                    name = fn_call.get("name")
                    args = fn_call.get("args", {})
                    fn_impl = TOOLS_REGISTRY.get(name)
                    result = fn_impl(**args) if fn_impl else {"error": "Tool not found"}
                    tools_used.append({"tool": name, "args": args, "result_summary": "Success" if result else "Empty"})

                    if name == "search_experiences" and isinstance(result, list) and len(result) > 0:
                        interactive_card = {"type": "experience_recommendation", "experience": result[0]}
                    elif name == "retrieve_user_bookings" and isinstance(result, list) and len(result) > 0:
                        interactive_card = {"type": "booking_summary", "data": result[0]}
                    elif name == "generate_smart_itinerary":
                        interactive_card = {"type": "itinerary_suggestion", "data": result}

                    contents.append({"role": "model", "parts": [{"functionCall": fn_call}]})
                    contents.append({"role": "function", "parts": [{"functionResponse": {"name": name, "response": result}}]})
                    continue

                text_resp = "".join(p.get("text", "") for p in parts).strip()
                if text_resp:
                    return text_resp, tools_used, interactive_card
    except Exception as exc:
        print("Gemini API call failed, falling back to deterministic engine:", exc)
        reply, tools_fallback, card_fallback = deterministic_concierge(message, language)
        return f"{reply}", tools_fallback + [{"tool": "gemini_fallback", "note": "Live API unreachable, used verified local engine"}], card_fallback

    return deterministic_concierge(message, language)

