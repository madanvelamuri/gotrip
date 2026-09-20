CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(150) UNIQUE,
    mobile VARCHAR(20) UNIQUE,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    role VARCHAR(20) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pricing (
    id SERIAL PRIMARY KEY,
    vehicle_type VARCHAR(30) UNIQUE NOT NULL,
    rate_per_km NUMERIC(10,2) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),

    from_location TEXT NOT NULL,
    from_lat NUMERIC(12,8),
    from_lng NUMERIC(12,8),

    to_location TEXT NOT NULL,
    to_lat NUMERIC(12,8),
    to_lng NUMERIC(12,8),

    distance_km NUMERIC(10,2) NOT NULL,

    vehicle_type VARCHAR(30) NOT NULL,
    rate_per_km NUMERIC(10,2) NOT NULL,
    total_fare NUMERIC(10,2) NOT NULL,

    travel_date DATE,
    status VARCHAR(30) DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO pricing
(vehicle_type, rate_per_km)
VALUES
('5 Seater', 10),
('7 Seater', 14);