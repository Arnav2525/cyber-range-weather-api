flowchart LR
  Client["🌐 Client (Browser / curl)"]

  subgraph Cluster["Node.js Cluster (multi-process on one host)"]
    Primary["Primary Process (forks workers)"]
    W1["Worker 1 (Express)"]
    W2["Worker 2 (Express)"]
    WN["Worker N (Express)"]
  end

  subgraph Worker["Per-worker Express Pipeline"]
    Helmet["🛡️ Helmet (Security Headers)"]
    RateLimit["⏱️ Rate Limiter"]
    Logger["📝 Pino-HTTP Logger"]
    Handler["📍 Route Handler: GET /locations/:zip"]
    Cache["🗄️ LRU Cache (optional)"]
  end

  GeoAPI["🌍 Open-Meteo Geocoding API"]
  WeatherAPI["🌤️ Open-Meteo Weather API"]

  Client --> Primary
  Primary --> W1 & W2 & WN

  W1 --> Helmet --> RateLimit --> Logger --> Handler
  Handler --> Cache
  Cache -->|miss| GeoAPI
  GeoAPI --> WeatherAPI
  WeatherAPI --> Handler
  Handler --> Client
