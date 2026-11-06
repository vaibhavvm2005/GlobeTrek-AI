"""GlobeTrek AI – AI chatbot service.

Uses Google Gemini with function-calling when an API key is present;
falls back to a deterministic keyword-based assistant otherwise.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime, timezone

from flask import current_app

from app.extensions import db
from app.models import (
    ChatHistory, Destination, Event, Experience, Category, TicketType, Booking,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt shared between Gemini and fallback
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are GlobeTrek AI, a helpful travel and event booking assistant. "
    "You help users discover destinations, find events, compare ticket "
    "options and plan trips. Always provide actual data from the database. "
    "Never invent prices or availability. "
    "Support English, Hindi, Kannada and Telugu. "
    "Keep answers concise and friendly. When listing results, use bullet "
    "points. Always include prices in ₹ where relevant."
)

# ---------------------------------------------------------------------------
# Database-query tool implementations
# ---------------------------------------------------------------------------

def _search_destinations(
    query: str = "",
    country: str = "",
    city: str = "",
    category: str = "",
) -> list[dict]:
    """Search destinations in the database."""
    q = Destination.query.filter_by(is_active=True)
    if query:
        q = q.filter(
            db.or_(
                Destination.name.ilike(f"%{query}%"),
                Destination.description.ilike(f"%{query}%"),
                Destination.city.ilike(f"%{query}%"),
                Destination.country.ilike(f"%{query}%"),
            )
        )
    if country:
        q = q.filter(Destination.country.ilike(f"%{country}%"))
    if city:
        q = q.filter(Destination.city.ilike(f"%{city}%"))
    if category:
        cat = Category.query.filter(Category.name.ilike(f"%{category}%")).first()
        if cat:
            q = q.filter_by(category_id=cat.id)
    results = q.limit(10).all()
    return [d.to_dict() for d in results]


def _search_experiences(
    query: str = "",
    category: str = "",
    country: str = "",
    city: str = "",
    max_price: float | None = None,
) -> list[dict]:
    """Search global experiences in the database across all 8 categories."""
    q = Experience.query.filter_by(is_active=True)
    if query:
        q = q.filter(
            db.or_(
                Experience.experience_name.ilike(f"%{query}%"),
                Experience.description.ilike(f"%{query}%"),
                Experience.city.ilike(f"%{query}%"),
                Experience.country.ilike(f"%{query}%"),
                Experience.location.ilike(f"%{query}%"),
            )
        )
    if category:
        cat = Category.query.filter(
            db.or_(Category.name.ilike(f"%{category}%"), Category.slug.ilike(f"%{category}%"))
        ).first()
        if cat:
            q = q.filter_by(category_id=cat.id)
    if country:
        q = q.filter(Experience.country.ilike(f"%{country}%"))
    if city:
        q = q.filter(Experience.city.ilike(f"%{city}%"))
    if max_price is not None:
        q = q.filter(Experience.ticket_price <= max_price)

    results = q.order_by(Experience.rating.desc()).limit(10).all()
    return [e.to_dict() for e in results]


def _search_events(
    query: str = "",
    city: str = "",
    event_date: str = "",
    category: str = "",
    max_price: float | None = None,
) -> list[dict]:
    """Search events in the database."""
    q = Event.query.filter_by(is_published=True, is_approved=True)
    q = q.filter(Event.status.in_(["UPCOMING", "ONGOING"]))
    if query:
        q = q.filter(
            db.or_(
                Event.title.ilike(f"%{query}%"),
                Event.description.ilike(f"%{query}%"),
                Event.city.ilike(f"%{query}%"),
                Event.venue_name.ilike(f"%{query}%"),
            )
        )
    if city:
        q = q.filter(Event.city.ilike(f"%{city}%"))
    if event_date:
        try:
            dt = date.fromisoformat(event_date)
            q = q.filter(Event.event_date >= dt)
        except ValueError:
            pass
    if category:
        cat = Category.query.filter(Category.name.ilike(f"%{category}%")).first()
        if cat:
            q = q.filter_by(category_id=cat.id)

    results = q.order_by(Event.event_date.asc()).limit(10).all()

    output = []
    for e in results:
        d = e.to_dict()
        ticket_types = TicketType.query.filter_by(event_id=e.id, is_active=True).all()
        d["ticket_types"] = [t.to_dict() for t in ticket_types]
        if max_price is not None:
            prices = [t.price for t in ticket_types]
            if prices and min(prices) > max_price:
                continue
        output.append(d)
    return output


def _get_availability(
    event_id: int | None = None,
    destination_id: int | None = None,
    check_date: str = "",
) -> dict:
    """Get ticket availability for an event or destination."""
    if event_id:
        event = db.session.get(Event, event_id)
        if not event:
            return {"error": "Event not found"}
        types = TicketType.query.filter_by(event_id=event_id, is_active=True).all()
        return {
            "event": event.title,
            "date": event.event_date.isoformat() if event.event_date else "",
            "tickets": [
                {
                    "name": t.name,
                    "price": t.price,
                    "available": t.quantity_available,
                    "total": t.quantity_total,
                }
                for t in types
            ],
        }
    elif destination_id:
        dest = db.session.get(Destination, destination_id)
        if not dest:
            return {"error": "Destination not found"}
        types = TicketType.query.filter_by(destination_id=destination_id, is_active=True).all()
        return {
            "destination": dest.name,
            "opening_hours": dest.opening_hours,
            "tickets": [
                {
                    "name": t.name,
                    "price": t.price,
                    "available": t.quantity_available,
                }
                for t in types
            ] if types else [{"name": "General", "price": dest.ticket_price, "available": dest.capacity}],
        }
    return {"error": "Provide event_id or destination_id"}


def _get_user_bookings_tool(user_id: int | None) -> list[dict]:
    """Return a user's bookings for the AI to describe."""
    if not user_id:
        return [{"message": "User not logged in"}]
    bookings = Booking.query.filter_by(user_id=user_id).order_by(
        Booking.created_at.desc()
    ).limit(10).all()
    return [b.to_dict() for b in bookings]


# ---------------------------------------------------------------------------
# Gemini function-calling definitions
# ---------------------------------------------------------------------------

TOOL_FUNCTIONS = {
    "search_destinations": _search_destinations,
    "search_events": _search_events,
    "search_experiences": _search_experiences,
    "get_availability": _get_availability,
    "get_user_bookings": _get_user_bookings_tool,
}

GEMINI_TOOL_DECLARATIONS = [
    {
        "name": "search_experiences",
        "description": "Search global curated experiences across all 8 categories by query, category, country, city, or max price.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search keyword for experience name"},
                "category": {"type": "string", "description": "Filter by category name or slug"},
                "country": {"type": "string", "description": "Filter by country"},
                "city": {"type": "string", "description": "Filter by city"},
                "max_price": {"type": "number", "description": "Maximum ticket price in INR"},
            },
        },
    },
    {
        "name": "search_destinations",
        "description": "Search for tourist destinations by query, country, city, or category.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search keyword for destination name"},
                "country": {"type": "string", "description": "Filter by country"},
                "city": {"type": "string", "description": "Filter by city"},
                "category": {"type": "string", "description": "Filter by category name"},
            },
        },
    },
    {
        "name": "search_events",
        "description": "Search for upcoming events by query, city, date, category, or max price.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search keyword for event title"},
                "city": {"type": "string", "description": "Filter by city"},
                "event_date": {"type": "string", "description": "Filter events from this date (YYYY-MM-DD)"},
                "category": {"type": "string", "description": "Filter by category name"},
                "max_price": {"type": "number", "description": "Maximum ticket price in INR"},
            },
        },
    },
    {
        "name": "get_availability",
        "description": "Check ticket availability for an event or destination.",
        "parameters": {
            "type": "object",
            "properties": {
                "event_id": {"type": "integer", "description": "Event ID"},
                "destination_id": {"type": "integer", "description": "Destination ID"},
                "check_date": {"type": "string", "description": "Date to check (YYYY-MM-DD)"},
            },
        },
    },
    {
        "name": "get_user_bookings",
        "description": "Get the current user's bookings.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {"type": "integer", "description": "User ID"},
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Gemini-powered chat
# ---------------------------------------------------------------------------

def _chat_gemini(
    user_message: str,
    session_id: str,
    user_id: int | None,
    language: str,
) -> str:
    """Send a message via the Google Gemini API with function calling."""
    import google.generativeai as genai  # noqa: E402

    genai.configure(api_key=current_app.config["GEMINI_API_KEY"])

    # Build conversation history from DB
    history_rows = (
        ChatHistory.query
        .filter_by(session_id=session_id)
        .order_by(ChatHistory.created_at.asc())
        .limit(20)
        .all()
    )
    contents = []
    for row in history_rows:
        contents.append({
            "role": "user" if row.role == "user" else "model",
            "parts": [row.content],
        })
    contents.append({"role": "user", "parts": [user_message]})

    # Declare tools
    tools = [genai.protos.Tool(
        function_declarations=[
            genai.protos.FunctionDeclaration(
                name=td["name"],
                description=td["description"],
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        k: genai.protos.Schema(
                            type=(
                                genai.protos.Type.NUMBER if v.get("type") == "number"
                                else genai.protos.Type.INTEGER if v.get("type") == "integer"
                                else genai.protos.Type.STRING
                            ),
                            description=v.get("description", ""),
                        )
                        for k, v in td["parameters"]["properties"].items()
                    },
                ),
            )
            for td in GEMINI_TOOL_DECLARATIONS
        ]
    )]

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=SYSTEM_PROMPT + f"\nRespond in {language} language when possible.",
        tools=tools,
    )

    response = model.generate_content(contents)

    # Handle function calls (up to 3 rounds)
    for _ in range(3):
        candidate = response.candidates[0]
        part = candidate.content.parts[0]

        if not hasattr(part, "function_call") or not part.function_call.name:
            break

        fn_name = part.function_call.name
        fn_args = dict(part.function_call.args) if part.function_call.args else {}

        # Inject user_id for booking queries
        if fn_name == "get_user_bookings":
            fn_args["user_id"] = user_id

        # Convert numeric args
        for k, v in fn_args.items():
            if isinstance(v, str) and v.isdigit():
                fn_args[k] = int(v)

        func = TOOL_FUNCTIONS.get(fn_name)
        if func is None:
            break

        try:
            result = func(**fn_args)
        except Exception as exc:
            logger.exception("Tool %s failed", fn_name)
            result = {"error": str(exc)}

        # Send the function result back
        contents.append({"role": "model", "parts": [part]})
        contents.append({
            "role": "user",
            "parts": [genai.protos.Part(
                function_response=genai.protos.FunctionResponse(
                    name=fn_name,
                    response={"result": json.dumps(result, default=str)},
                )
            )],
        })
        response = model.generate_content(contents)

    # Extract text
    try:
        return response.text
    except Exception:
        return response.candidates[0].content.parts[0].text


# ---------------------------------------------------------------------------
# Deterministic fallback (no API key)
# ---------------------------------------------------------------------------

def _chat_fallback(
    user_message: str,
    session_id: str,
    user_id: int | None,
    language: str,
) -> str:
    """Intelligent database-grounded assistant fallback when Gemini API key is absent."""
    msg_lower = user_message.lower().strip()

    greetings = {"hi", "hello", "hey", "namaste", "hola", "vanakkam", "namaskara"}
    if msg_lower in greetings or any(msg_lower.startswith(g + " ") for g in greetings):
        return (
            "Hello! 👋 I am **GlobeTrek AI**, your intelligent travel and events concierge.\n\n"
            "Here is what I can do for you right now:\n"
            "• 🏏 **Find matches & events**: Ask *'Show cricket matches in Bengaluru'* or *'Concerts in London'*\n"
            "• 🏛️ **Discover destinations**: Ask *'Places in Paris'* or *'Top attractions in Agra'*\n"
            "• 💰 **Budget filters**: Ask *'Trip under ₹5000'* or *'Tickets below ₹3000'*\n"
            "• 🎟️ **Check availability**: Ask *'Availability for event 2'*\n"
            "• 📋 **Track reservations**: Ask *'My bookings'*\n\n"
            "What can I help you find today?"
        )

    # --- multilingual greetings / simple handling ---
    if ("नमस्ते" in msg_lower or "ताज" in msg_lower or "दिखाओ" in msg_lower or "यात्रा" in msg_lower) or language == "hi":
        taj = Destination.query.filter(Destination.name.ilike("%Taj Mahal%")).first()
        taj_info = f"₹{taj.ticket_price} (प्रवेश शुल्क), शहर: {taj.city}" if taj else "विश्व प्रसिद्ध धरोहर"
        return (
            f"नमस्ते! 🙏 ग्लोबट्रेक एआई में आपका स्वागत है।\n"
            f"• **ताज महल (आगरा)**: {taj_info}।\n"
            f"• आगामी मैच: **आईसीसी चैंपियंस ट्रॉफी 2026** (बेंगलुरु)।\n"
            f"आप टिकट बुक करने के लिए किसी भी इवेंट या स्थल का नाम पूछ सकते हैं।"
        )

    if ("ಕಾರ್ಯಕ್ರಮಗಳು" in msg_lower or "ತಾಣಗಳು" in msg_lower or "ನಮಸ್ಕಾರ" in msg_lower) or language == "kn":
        return (
            "ನಮಸ್ಕಾರ! 🙏 ಗ್ಲೋಬ್‌ಟ್ರೆಕ್ ಎಐ (GlobeTrek AI) ಗೆ ಸುಸ್ವಾಗತ.\n"
            "• **ಎಂ. ಚಿನ್ನಸ್ವಾಮಿ ಕ್ರೀಡಾಂಗಣ (ಬೆಂಗಳೂರು)**: ಐಸಿಸಿ ಚಾಂಪಿಯನ್ಸ್ ಟ್ರೋಫಿ 2026 ಭಾರತ vs ಆಸ್ಟ್ರೇಲಿಯಾ ಫೈನಲ್ ಪಂದ್ಯ.\n"
            "• ಪ್ರಸಿದ್ಧ ಪ್ರವಾಸಿ ತಾಣಗಳು: ಈಫೆಲ್ ಟವರ್, ತಾಜ್ ಮಹಲ್, ಲೂವ್ರ್ ಮ್ಯೂಸಿಯಂ.\n"
            "ನೀವು ಯಾವುದೇ ಕಾರ್ಯಕ್ರಮ ಅಥವಾ ಟಿಕೆಟ್‌ಗಳ ಬಗ್ಗೆ ವಿವರಗಳನ್ನು ಕೇಳಬಹುದು!"
        )

    if ("నమస్కారం" in msg_lower or "ఈవెంట్" in msg_lower or "స్థలాలు" in msg_lower) or language == "te":
        return (
            "నమస్కారం! 🙏 గ్లోబ్‌ట్రెక్ AI కి స్వాగతం.\n"
            "• **బెంగళూరు క్రికెట్ మ్యాచ్**: ICC ఛాంపియన్స్ ట్రోఫీ 2026 ఫైనల్ (చిన్నస్వామి స్టేడియం).\n"
            "• అంతర్జాతీయ పర్యాటక ప్రదేశాలు: పారిస్, లండన్, టోక్యో.\n"
            "మీకు ఏ ఈవెంట్ లేదా టిక్కెట్ సమాచారం కావాలి?"
        )

    # --- bookings intent ---
    if any(kw in msg_lower for kw in ["my booking", "my ticket", "booking status", "order", "my pass"]):
        if not user_id:
            return "Please log in to view your bookings and digital passes."
        bookings = _get_user_bookings_tool(user_id)
        if not bookings:
            return "You don't have any active bookings yet. Would you like to explore events or attractions?"
        lines = ["Here are your recent bookings:\n"]
        for b in bookings:
            lines.append(
                f"• **{b.get('item_name', 'Booking')}** – Status: {b.get('status', '')} "
                f"(Ref: `{b.get('booking_ref', '')[:8]}`) – ₹{b.get('grand_total', 0)}"
            )
        return "\n".join(lines)

    # --- availability intent ---
    avail_match = re.search(r"availability\s+(?:for\s+)?(?:event|destination)\s+(\d+)", msg_lower)
    if avail_match:
        item_id = int(avail_match.group(1))
        if "destination" in msg_lower:
            data = _get_availability(destination_id=item_id)
        else:
            data = _get_availability(event_id=item_id)
        if "error" in data:
            return data["error"]
        name = data.get("event") or data.get("destination", "")
        lines = [f"**{name}** availability:\n"]
        for t in data.get("tickets", []):
            lines.append(f"• **{t['name']}** – ₹{t['price']} ({t['available']} seats remaining)")
        return "\n".join(lines)

    # --- Extract budget / price limits ---
    price_match = re.search(r'(?:under|below|less than|within|max)\s*(?:₹|rs\.?|inr)?\s*(\d+)', msg_lower)
    max_price = float(price_match.group(1)) if price_match else None

    # --- Extract recognized city / country ---
    city = ""
    city_map = {
        "bengaluru": "Bengaluru",
        "bangalore": "Bengaluru",
        "london": "London",
        "paris": "Paris",
        "tokyo": "Tokyo",
        "mumbai": "Mumbai",
        "delhi": "Delhi",
        "rome": "Rome",
        "agra": "Agra",
        "cairo": "Cairo",
        "dubai": "Dubai",
        "new york": "New York",
    }
    for alias, cname in city_map.items():
        if alias in msg_lower:
            city = cname
            break

    if not city:
        for word in ["in ", "at ", "near ", "for "]:
            if word in msg_lower:
                part = msg_lower.split(word, 1)[1].split(",")[0].split("?")[0].strip().title()
                if part and len(part) < 30 and part.lower() not in ["paris", "london", "bengaluru"]:
                    city = part
                break

    # --- Check for sports & event keywords ---
    is_event_query = any(kw in msg_lower for kw in [
        "event", "show", "concert", "festival", "match", "game", "cricket", "sports",
        "coldplay", "summit", "expo", "anime", "carnival", "tournament", "music", "stadium"
    ])

    is_dest_query = any(kw in msg_lower for kw in [
        "destination", "place", "places", "visit", "tourist", "attraction", "sight",
        "monument", "tower", "museum", "trip", "travel", "explore"
    ])

    # If asking for cricket or sports specifically
    if "cricket" in msg_lower or "match" in msg_lower or "sports" in msg_lower:
        results = _search_events(query="cricket", city=city, max_price=max_price)
        if not results and city:
            results = _search_events(city=city, max_price=max_price)
        if results:
            lines = [f"🏏 Here are upcoming matches and sports events{' in ' + city if city else ''}:\n"]
            for e in results:
                prices = [t["price"] for t in e.get("ticket_types", [])]
                price_str = f"from ₹{min(prices)}" if prices else "Free Entry"
                venue_name = e.get("venue", {}).get("name", e.get("city", "")) if isinstance(e.get("venue"), dict) else e.get("city", "")
                lines.append(
                    f"• **{e['title']}**\n"
                    f"  📍 {venue_name}, {e.get('city', '')} | 📅 {e.get('event_date', '')}\n"
                    f"  🎟️ Tickets {price_str} | Status: `{e.get('status', 'UPCOMING')}`\n"
                    f"  🔗 [Book Tickets](/events/{e['id']})\n"
                )
            return "\n".join(lines)

    # General event search
    if is_event_query:
        query_word = ""
        if "concert" in msg_lower or "music" in msg_lower or "coldplay" in msg_lower:
            query_word = "Coldplay"
        elif "summit" in msg_lower or "tech" in msg_lower or "ai" in msg_lower:
            query_word = "Summit"
        elif "anime" in msg_lower or "gaming" in msg_lower:
            query_word = "Anime"

        results = _search_events(query=query_word, city=city, max_price=max_price)
        if not results:
            results = _search_events(city=city, max_price=max_price)
        if not results:
            results = _search_events(max_price=max_price)

        if results:
            lines = [f"🎟️ Here are featured events{' in ' + city if city else ''}:\n"]
            for e in results[:4]:
                prices = [t["price"] for t in e.get("ticket_types", [])]
                price_str = f"from ₹{min(prices)}" if prices else "Price TBD"
                lines.append(
                    f"• **{e['title']}**\n"
                    f"  📍 {e.get('city', '')} | 📅 {e.get('event_date', '')} | 💵 {price_str}\n"
                    f"  🔗 [View & Reserve](/events/{e['id']})\n"
                )
            return "\n".join(lines)

    # General destination search
    if is_dest_query or (city and not is_event_query):
        results = _search_destinations(city=city)
        if not results and city:
            results = _search_destinations(query=city)
        if not results:
            results = _search_destinations()

        if max_price is not None:
            results = [d for d in results if d.get("ticket_price", 0) <= max_price]

        if results:
            lines = [f"🌍 Top destinations{' in ' + city if city else ''}:\n"]
            for d in results[:4]:
                rating_str = f"⭐ {d.get('rating', '4.8')}" if d.get('rating') else ""
                lines.append(
                    f"• **{d['name']}** ({d.get('city', '')}, {d.get('country', '')})\n"
                    f"  💵 Entry: ₹{d.get('ticket_price', 0)} | {rating_str}\n"
                    f"  🕒 Open: {d.get('opening_hours', 'Daily')}\n"
                    f"  🔗 [Explore Attraction](/destinations/{d['id']})\n"
                )
            return "\n".join(lines)

    # Search in 80+ curated experiences
    exp_results = _search_experiences(query=msg_lower if len(msg_lower) > 3 else "", city=city, max_price=max_price)
    if exp_results:
        lines = [f"🌟 Found matching curated experiences{' in ' + city if city else ''}:\n"]
        for exp in exp_results[:4]:
            lines.append(
                f"• **{exp['experience_name']}** ({exp['city']}, {exp['country']})\n"
                f"  🏷️ Category: {exp.get('category', 'Experience')} | ⭐ {exp.get('rating', '4.8')}\n"
                f"  💵 Tickets from ₹{exp.get('ticket_price', 0):.0f}\n"
                f"  🔗 [View Details](/experiences/{exp['id']}) | [Book Now](/booking/select/experience/{exp['id']})\n"
            )
        return "\n".join(lines)

    # Budget filter query (e.g. 'Trip under ₹5000')
    if max_price is not None:
        dest_results = [d for d in _search_destinations() if d.get("ticket_price", 0) <= max_price]
        event_results = _search_events(max_price=max_price)
        lines = [f"💰 Options under ₹{int(max_price)}:\n"]
        if dest_results:
            lines.append("**Top Attractions:**")
            for d in dest_results[:3]:
                lines.append(f"• **{d['name']}** ({d['city']}) – ₹{d.get('ticket_price', 0)}")
        if event_results:
            lines.append("\n**Live Events:**")
            for e in event_results[:3]:
                prices = [t["price"] for t in e.get("ticket_types", [])]
                p_str = f"₹{min(prices)}" if prices else "Free"
                lines.append(f"• **{e['title']}** ({e.get('city')}) – from {p_str}")
        if len(lines) > 1:
            return "\n".join(lines)

    # --- catch-all fallback ---
    return (
        "I can help you explore and book worldwide:\n\n"
        "• 🏏 **Matches**: Ask *'Show cricket matches in Bengaluru'*\n"
        "• 🎵 **Concerts**: Ask *'Concerts in London'*\n"
        "• 🏛️ **Sightseeing**: Ask *'Places in Paris'*\n"
        "• 💰 **Budget**: Ask *'Trip under ₹5000'*\n"
        "• 📋 **Reservations**: Ask *'My bookings'*\n\n"
        "What destination or event would you like to explore?"
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def chat(
    user_message: str = "",
    session_id: str = "",
    user_id: int | None = None,
    language: str = "en",
    message: str | None = None,
) -> str:
    """Process a user message and return the assistant's reply.

    Accepts both `user_message` and `message` parameter names.
    Uses Gemini when GEMINI_API_KEY is configured, otherwise falls back
    to deterministic database-grounded matching.
    """
    clean_message = (message if message is not None else user_message or "").strip()
    if not clean_message:
        return "Please ask a question about destinations, events, or bookings."

    try:
        # Persist user message
        user_entry = ChatHistory(
            user_id=user_id,
            session_id=session_id,
            role="user",
            content=clean_message,
        )
        db.session.add(user_entry)
        db.session.commit()

        # Choose backend
        gemini_key = current_app.config.get("GEMINI_API_KEY", "")
        if gemini_key:
            try:
                reply = _chat_gemini(clean_message, session_id, user_id, language)
            except Exception:
                logger.exception("Gemini chat failed – falling back")
                reply = _chat_fallback(clean_message, session_id, user_id, language)
        else:
            reply = _chat_fallback(clean_message, session_id, user_id, language)

        # Persist assistant reply
        assistant_entry = ChatHistory(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=reply,
        )
        db.session.add(assistant_entry)
        db.session.commit()

        return reply

    except Exception:
        db.session.rollback()
        logger.exception("chat() failed")
        return "I'm sorry, I encountered an error. Please try again."
