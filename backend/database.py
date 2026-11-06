import sqlite3
import os
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "ticketmate.db"

def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 8000")
    return conn

def hash_password(password: str) -> str:
    salt = "wayfarer_salt_2026"
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return key.hex()

def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

def init_database(force_recreate: bool = False):
    with get_db() as conn:
        conn.execute("PRAGMA foreign_keys = OFF")
        # Check if events table has slug column; if not, drop old prototype tables
        try:
            conn.execute("SELECT slug FROM events LIMIT 1")
        except sqlite3.OperationalError:
            force_recreate = True

        if force_recreate:
            conn.executescript("""
            DROP TABLE IF EXISTS chat_messages;
            DROP TABLE IF EXISTS chat_sessions;
            DROP TABLE IF EXISTS itineraries;
            DROP TABLE IF EXISTS wishlists;
            DROP TABLE IF EXISTS audit_logs;
            DROP TABLE IF EXISTS ticket_scans;
            DROP TABLE IF EXISTS refunds;
            DROP TABLE IF EXISTS payments;
            DROP TABLE IF EXISTS reservations;
            DROP TABLE IF EXISTS booking_items;
            DROP TABLE IF EXISTS bookings;
            DROP TABLE IF EXISTS inventory;
            DROP TABLE IF EXISTS ticket_types;
            DROP TABLE IF EXISTS events;
            DROP TABLE IF EXISTS venues;
            DROP TABLE IF EXISTS categories;
            DROP TABLE IF EXISTS users;
            """)
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'CUSTOMER',
            phone TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            icon TEXT NOT NULL,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS venues (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            city TEXT NOT NULL,
            address TEXT NOT NULL,
            capacity INTEGER DEFAULT 500,
            latitude REAL,
            longitude REAL,
            contact_email TEXT
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE,
            category_id TEXT NOT NULL,
            venue_id TEXT,
            city TEXT NOT NULL,
            price INTEGER NOT NULL,
            rating REAL DEFAULT 4.8,
            image TEXT NOT NULL,
            date_str TEXT NOT NULL,
            start_time TEXT DEFAULT '10:00 AM',
            end_time TEXT DEFAULT '06:00 PM',
            description TEXT NOT NULL,
            highlights TEXT,
            is_published INTEGER DEFAULT 1,
            featured INTEGER DEFAULT 0,
            cancellation_policy TEXT DEFAULT 'Free cancellation up to 24 hours before event',
            inventory INTEGER DEFAULT 100,
            created_at TEXT NOT NULL,
            FOREIGN KEY (category_id) REFERENCES categories(id),
            FOREIGN KEY (venue_id) REFERENCES venues(id)
        );

        CREATE TABLE IF NOT EXISTS ticket_types (
            id TEXT PRIMARY KEY,
            event_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            capacity INTEGER DEFAULT 100,
            booking_limit INTEGER DEFAULT 10,
            description TEXT,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS inventory (
            id TEXT PRIMARY KEY,
            ticket_type_id TEXT NOT NULL UNIQUE,
            total_quantity INTEGER NOT NULL,
            available_quantity INTEGER NOT NULL,
            reserved_quantity INTEGER DEFAULT 0,
            FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            customer_phone TEXT,
            event_id INTEGER NOT NULL,
            total_amount INTEGER NOT NULL,
            taxes_fees INTEGER DEFAULT 59,
            currency TEXT DEFAULT 'INR',
            status TEXT NOT NULL,
            idempotency_key TEXT UNIQUE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (event_id) REFERENCES events(id)
        );

        CREATE TABLE IF NOT EXISTS booking_items (
            id TEXT PRIMARY KEY,
            booking_id TEXT NOT NULL,
            ticket_type_id TEXT NOT NULL,
            ticket_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price INTEGER NOT NULL,
            subtotal INTEGER NOT NULL,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
            FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id)
        );

        CREATE TABLE IF NOT EXISTS reservations (
            id TEXT PRIMARY KEY,
            booking_id TEXT NOT NULL UNIQUE,
            ticket_type_id TEXT,
            event_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            status TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events(id)
        );

        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            booking_id TEXT NOT NULL UNIQUE,
            gateway TEXT NOT NULL,
            gateway_reference TEXT,
            amount INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (booking_id) REFERENCES bookings(id)
        );

        CREATE TABLE IF NOT EXISTS refunds (
            id TEXT PRIMARY KEY,
            booking_id TEXT NOT NULL,
            payment_id TEXT NOT NULL,
            amount INTEGER NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'REQUESTED',
            created_at TEXT NOT NULL,
            processed_at TEXT,
            reviewed_by TEXT,
            FOREIGN KEY (booking_id) REFERENCES bookings(id),
            FOREIGN KEY (payment_id) REFERENCES payments(id)
        );

        CREATE TABLE IF NOT EXISTS ticket_scans (
            id TEXT PRIMARY KEY,
            booking_id TEXT NOT NULL,
            scanned_by TEXT,
            scanned_at TEXT NOT NULL,
            location TEXT DEFAULT 'Main Gate',
            result TEXT NOT NULL,
            FOREIGN KEY (booking_id) REFERENCES bookings(id)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_email TEXT NOT NULL,
            actor_role TEXT NOT NULL,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS wishlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            event_id INTEGER NOT NULL,
            price_alert_threshold INTEGER,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, event_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS itineraries (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            destination TEXT NOT NULL,
            start_date TEXT,
            end_date TEXT,
            days_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            language TEXT NOT NULL DEFAULT 'en',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            tools_json TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        );
        """)

        # Seed categories
        categories = [
            ("cat-museum", "Museums", "museums", "Landmark", "Heritage, artifacts, art galleries, and historic halls"),
            ("cat-concert", "Concerts", "concerts", "Music2", "Live music festivals, acoustic sets, and orchestral tours"),
            ("cat-adventure", "Adventures", "adventures", "Compass", "Mountain treks, camping, outdoor expeditions, and safaris"),
            ("cat-culture", "Cultural Programs", "cultural", "Palette", "Traditional dances, folk plays, and heritage walks"),
            ("cat-exhibition", "Exhibitions", "exhibitions", "Building2", "Design showcases, modern art, and technology expos"),
            ("cat-college", "College Programs", "college-events", "GraduationCap", "Campus hackathons, youth fests, and academic symposiums"),
            ("cat-attraction", "Tourist Attractions", "attractions", "Sparkles", "Iconic landmarks, palaces, and botanical gardens"),
        ]
        for c in categories:
            conn.execute("INSERT OR IGNORE INTO categories(id, name, slug, icon, description) VALUES(?,?,?,?,?)", c)

        # Seed venues
        venues = [
            ("ven-ngma", "National Gallery of Modern Art", "Bengaluru", "49 Palace Road, Manikyavelu Mansion", 1200, 12.9897, 77.5878, "curator@ngmablr.gov.in"),
            ("ven-manpho", "Manpho Convention Grounds", "Bengaluru", "Nagavara Ring Road, Near Manyata Tech Park", 5000, 13.0456, 77.6201, "events@manphocentre.com"),
            ("ven-nandi", "Nandi Hills Base Camp", "Bengaluru", "Chikkaballapur District, Karnataka", 400, 13.3702, 77.6835, "info@karnatakatourism.org"),
            ("ven-hampi", "Virupaksha Complex & Bazaar", "Hampi", "Hampi Historic Site, Bellary", 2000, 15.3350, 76.4600, "heritage@asi.nic.in"),
            ("ven-ncpa", "National Centre for Performing Arts", "Mumbai", "NCPA Marg, Nariman Point", 1500, 18.9272, 72.8205, "booking@ncpamumbai.com"),
            ("ven-iisc", "JN Tata Auditorium, IISc Campus", "Bengaluru", "Indian Institute of Science, Malleshwaram", 900, 13.0219, 77.5671, "events@iisc.ac.in"),
            ("ven-mysore", "Mysore Palace Royal Grounds", "Mysuru", "Sayyaji Rao Road, Agrahara", 8000, 12.3051, 76.6551, "tourism@mysorepalace.gov.in"),
            ("ven-coorg", "Brahmagiri Wildlife Sanctuary Trailhead", "Coorg", "Kutta, South Kodagu", 300, 12.0125, 75.9872, "forest@coorgtrails.org"),
        ]
        for v in venues:
            conn.execute("INSERT OR IGNORE INTO venues(id, name, city, address, capacity, latitude, longitude, contact_email) VALUES(?,?,?,?,?,?,?,?)", v)

        # Seed Users (Admins and Customers)
        seed_users = [
            ("usr-admin", "admin@wayfarer.com", hash_password("admin123"), "Maya Shenoy", "SUPER_ADMIN", "+91 98450 11223"),
            ("usr-eventmgr", "events@wayfarer.com", hash_password("events123"), "Rajesh Rao", "EVENT_MANAGER", "+91 98450 22334"),
            ("usr-staff", "staff@wayfarer.com", hash_password("staff123"), "Deepa Nair", "TICKET_STAFF", "+91 98450 33445"),
            ("usr-cust1", "customer@wayfarer.com", hash_password("pass123"), "Aarav Sharma", "CUSTOMER", "+91 98450 44556"),
            ("usr-cust2", "priya@example.com", hash_password("pass123"), "Priya Kulkarni", "CUSTOMER", "+91 98450 55667"),
        ]
        now_time = utcnow()
        for u in seed_users:
            conn.execute("""
            INSERT OR IGNORE INTO users(id, email, password_hash, full_name, role, phone, created_at)
            VALUES(?,?,?,?,?,?,?)
            """, (*u, now_time))

        # Check if events already seeded
        event_count = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        if event_count > 0:
            conn.commit()
            return

        # Seed Events
        seed_events = [
            (
                1, "Bengaluru Museum of Modern Art", "bengaluru-museum-modern-art", "cat-museum", "ven-ngma",
                "Bengaluru", 150, 4.9,
                "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=85",
                "Open Daily (Tue-Sun)", "10:00 AM", "05:00 PM",
                "Explore rare 18th century miniatures, Tanjore gold leaves, and vibrant modern Indian canvases housed in a historic heritage mansion with leafy sculpture gardens.",
                json.dumps(["Sculpture garden walking tour", "Audio guide included in 3 languages", "Free locker & stroller access", "Cafeteria overlooking historic lotus pool"]),
                1, 1, 120
            ),
            (
                2, "Echoes of India: Folk & Fusion Live", "echoes-of-india-live", "cat-concert", "ven-manpho",
                "Bengaluru", 499, 4.8,
                "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85",
                "15 November 2026", "06:30 PM", "10:30 PM",
                "An electrifying evening of contemporary Indian sounds fusing Rajasthani folk strings, Carnatic flute improvisations, and synth bass.",
                json.dumps(["Over 4 hours of live ensemble sets", "Food and artisanal craft stalls", "Dedicated seating and front-row standing lounge"]),
                1, 1, 250
            ),
            (
                3, "Nandi Hills Sunrise & Cloudwalk Trek", "nandi-hills-sunrise-trek", "cat-adventure", "ven-nandi",
                "Bengaluru", 699, 4.9,
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
                "Every Saturday & Sunday", "04:30 AM", "09:30 AM",
                "Begin your trek under starry skies, crest the fortress cliffs as dawn paints the valley in gold, and relish fresh hot filter coffee at the peak.",
                json.dumps(["Certified wilderness guides", "Complimentary traditional breakfast & hot beverage", "First aid & safety escort"]),
                1, 1, 60
            ),
            (
                4, "Hampi Ruined Empires Heritage Walk", "hampi-heritage-walk", "cat-attraction", "ven-hampi",
                "Hampi", 349, 4.9,
                "https://images.unsplash.com/photo-1590059390041-2f6b1f1c95a2?auto=format&fit=crop&w=1200&q=85",
                "Daily at Dawn & Dusk", "06:00 AM", "09:30 AM",
                "Step through boulder-strewn monuments of the Vijayanagara Empire with an authorized archaeological storyteller. Discover the musical pillars and monolithic bull.",
                json.dumps(["Authorized ASI heritage narrator", "Headphones for clear audio even at distance", "Small groups under 15 persons"]),
                1, 1, 90
            ),
            (
                5, "Modern Indian Architecture Biennale", "modern-architecture-biennale", "cat-exhibition", "ven-ncpa",
                "Mumbai", 299, 4.7,
                "https://images.unsplash.com/photo-1545987796-200677ee1011?auto=format&fit=crop&w=1200&q=85",
                "20–28 November 2026", "11:00 AM", "07:00 PM",
                "A visionary showcase of sustainable tropical materials, terracotta facades, and regenerative city design shaping South Asia.",
                json.dumps(["Scale physical models & interactive VR pavilions", "Keynote speeches from leading urban architects", "Catalog print included"]),
                1, 0, 150
            ),
            (
                6, "IISc Pravega Tech & Innovation Summit", "pravega-tech-summit", "cat-college", "ven-iisc",
                "Bengaluru", 199, 4.8,
                "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85",
                "12–14 December 2026", "09:00 AM", "06:00 PM",
                "India’s premier science fest featuring student aerospace prototypes, robotics challenges, quantum computing workshops, and guest lectures.",
                json.dumps(["Access to all 12 experimental labs", "Participation certificate included", "Networking lounge with research fellows"]),
                1, 1, 300
            ),
            (
                7, "Mysore Palace Twilight Illumination & Tour", "mysore-palace-illumination", "cat-culture", "ven-mysore",
                "Mysuru", 249, 4.9,
                "https://images.unsplash.com/photo-1600100397608-f010e422a59a?auto=format&fit=crop&w=1200&q=85",
                "Weekends & Holidays", "05:00 PM", "08:30 PM",
                "Witness the dazzling moment 100,000 bulbs illuminate the Indo-Saracenic palace walls, accompanied by the Karnataka police brass band.",
                json.dumps(["Reserved seating for illumination spectacle", "Audio guide in English, Kannada & Hindi", "Palace Museum access"]),
                1, 1, 500
            ),
            (
                8, "Brahmagiri Canopy Rainforest Trek", "coorg-brahmagiri-trek", "cat-adventure", "ven-coorg",
                "Coorg", 899, 4.9,
                "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=85",
                "Friday to Sunday", "07:00 AM", "02:00 PM",
                "Navigate misty coffee plantations, shola forest reserves, and the crystal Iruppu waterfalls with indigenous naturalist scouts.",
                json.dumps(["Forest entry permits & insurance included", "Kodava traditional packed picnic meal", "Leech protection socks provided"]),
                1, 0, 45
            ),
            (
                9, "Visvesvaraya Science & Innovation Museum", "vitm-science-museum", "cat-museum", "ven-ngma",
                "Bengaluru", 120, 4.8,
                "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=1200&q=85",
                "Open Daily", "09:30 AM", "05:30 PM",
                "Interactive physics galleries, dinosaur animatronics corner, engine mockups, and space exploration simulators beloved by families and students.",
                json.dumps(["Hands-on experiment consoles", "Full dome 3D sky theatre show", "Demonstrations every hour"]),
                1, 0, 200
            ),
            (
                10, "Classical Kathakali & Yakshagana Night", "kathakali-yakshagana-night", "cat-culture", "ven-ncpa",
                "Mumbai", 599, 4.8,
                "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=85",
                "28 November 2026", "07:00 PM", "09:45 PM",
                "Experience the intense mythological storytelling, thunderous percussion, elaborate painted headgear, and expressive choreography of Karnataka and Kerala.",
                json.dumps(["Live makeup demonstration 1 hour prior", "Subtitled program guide booklet", "Artist Q&A session post show"]),
                1, 0, 180
            ),
            (
                11, "Bengaluru Artisan Coffee & Roastery Trail", "bengaluru-coffee-trail", "cat-attraction", "ven-ngma",
                "Bengaluru", 450, 4.9,
                "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=85",
                "Every Saturday", "09:00 AM", "12:00 PM",
                "Taste single-origin coffees from Chikmagalur and Biligirirangana Hills. Learn cupping, roasting notes, and pour-over brewing with Q-graders.",
                json.dumps(["5 distinct specialty coffee tastings", "Take-home 150g freshly roasted sample", "Bakery pairing bites"]),
                1, 0, 30
            ),
            (
                12, "Ramanagara Silk Cocoon & Bouldering Day", "ramanagara-bouldering-day", "cat-adventure", "ven-nandi",
                "Bengaluru", 750, 4.7,
                "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1200&q=85",
                "Every Sunday", "06:30 AM", "01:30 PM",
                "Scale the granite boulders of Sholay fame, accompanied by climbing instructors, followed by a visit to Asia’s largest silk cocoon market.",
                json.dumps(["Climbing harnesses, helmets & chalk provided", "Beginner friendly climbing routes", "Local village South Indian breakfast"]),
                1, 0, 50
            ),
        ]

        for ev in seed_events:
            conn.execute("""
            INSERT OR REPLACE INTO events(
                id, title, slug, category_id, venue_id, city, price, rating,
                image, date_str, start_time, end_time, description, highlights,
                is_published, featured, inventory, created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (*ev, now_time))

        # Seed ticket types and inventory for each event
        for ev in seed_events:
            ev_id = ev[0]
            base_price = ev[6]
            # 3 ticket tiers per event: General, Student, VIP / Guided
            tiers = [
                (f"tt-{ev_id}-gen", ev_id, "General Admission", base_price, 80, 10, "Standard admission with full venue access"),
                (f"tt-{ev_id}-stu", ev_id, "Student / Youth Pass", max(50, int(base_price * 0.75)), 40, 6, "Discounted admission for students (Valid ID required at gate)"),
                (f"tt-{ev_id}-vip", ev_id, "VIP / Guided Experience", int(base_price * 1.6), 25, 4, "Express queue entry, designated front-tier seating, and audio guide"),
            ]
            for t in tiers:
                conn.execute("INSERT OR REPLACE INTO ticket_types(id, event_id, name, price, capacity, booking_limit, description) VALUES(?,?,?,?,?,?,?)", t)
                conn.execute("INSERT OR REPLACE INTO inventory(id, ticket_type_id, total_quantity, available_quantity, reserved_quantity) VALUES(?,?,?,?,?)",
                             (f"inv-{t[0]}", t[0], t[3], t[3], 0))

        # Create sample existing bookings so Admin Dashboard shows authentic analytics right away
        sample_bookings = [
            ("WF-7A8B9C", "usr-cust1", "Aarav Sharma", "customer@wayfarer.com", "+91 98450 44556", 1, 359, 59, "INR", "CONFIRMED", "idemp-001", "2026-11-04T10:15:00Z", "2026-11-04T10:15:00Z"),
            ("WF-2D3E4F", "usr-cust2", "Priya Kulkarni", "priya@example.com", "+91 98450 55667", 2, 1057, 59, "INR", "CONFIRMED", "idemp-002", "2026-11-05T14:30:00Z", "2026-11-05T14:30:00Z"),
            ("WF-5G6H7J", "usr-cust1", "Aarav Sharma", "customer@wayfarer.com", "+91 98450 44556", 3, 758, 59, "INR", "CONFIRMED", "idemp-003", "2026-11-05T18:45:00Z", "2026-11-05T18:45:00Z"),
            ("WF-8K9L0M", "usr-cust2", "Priya Kulkarni", "priya@example.com", "+91 98450 55667", 4, 408, 59, "INR", "CANCELLED", "idemp-004", "2026-11-03T11:20:00Z", "2026-11-03T11:20:00Z"),
            ("WF-1N2P3Q", "usr-cust1", "Aarav Sharma", "customer@wayfarer.com", "+91 98450 44556", 7, 557, 59, "INR", "CONFIRMED", "idemp-005", "2026-11-06T09:00:00Z", "2026-11-06T09:00:00Z"),
        ]

        for b in sample_bookings:
            conn.execute("""
            INSERT OR REPLACE INTO bookings(id, user_id, customer_name, customer_email, customer_phone, event_id, total_amount, taxes_fees, currency, status, idempotency_key, created_at, updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, b)
            # Items
            conn.execute("""
            INSERT OR REPLACE INTO booking_items(id, booking_id, ticket_type_id, ticket_name, quantity, unit_price, subtotal)
            VALUES(?,?,?,?,?,?,?)
            """, (f"item-{b[0]}", b[0], f"tt-{b[5]}-gen", "General Admission", 2, b[6]//2, b[6]-59))
            # Payment
            conn.execute("""
            INSERT OR REPLACE INTO payments(id, booking_id, gateway, gateway_reference, amount, status, created_at)
            VALUES(?,?,?,?,?,?,?)
            """, (f"PAY-{b[0]}", b[0], "SIMULATED", f"sim-tx-{b[0]}", b[6], "VERIFIED" if b[9]=="CONFIRMED" else "REFUNDED", b[11]))

        # Add initial audit logs
        conn.execute("""
        INSERT OR IGNORE INTO audit_logs(id, actor_email, actor_role, action, entity_type, entity_id, details, created_at)
        VALUES(1, 'system@wayfarer.com', 'SUPER_ADMIN', 'SYSTEM_INIT', 'SYSTEM', 'ticketmate.db', 'Authoritative database schema initialized and seeded with 12 destinations', ?)
        """, (now_time,))

        conn.commit()

if __name__ == "__main__":
    init_database()
    print("Authoritative database initialized successfully at", DB_PATH)
