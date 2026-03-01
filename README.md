### 🏗️ System Architecture
```mermaid


flowchart LR
  Client["🌐 Client<br>(Browser / curl)"]

  subgraph Cluster["Node.js Cluster"]
    Primary["Primary Process<br>(forks workers)"]
    W1["Worker 1"]
    W2["Worker 2"]
    WN["Worker N"]
  end

  subgraph Pipeline["Per-Worker Express Pipeline"]
    Helmet["🛡️ Helmet<br>(Security Headers)"]
    RateLimit["⏱️ Rate Limiter<br>(100 req/15 min)"]
    Logger["📝 Pino-HTTP<br>Logger"]
    Handler["📍 Route Handler<br>GET /locations/:zip"]
    Cache["🗄️ LRU Cache"]
  end

  GeoAPI["🌍 Open-Meteo<br>Geocoding API"]
  WeatherAPI["🌤️ Open-Meteo<br>Weather API"]

  Client --> Primary
  Primary --> W1 & W2 & WN
  W1 --> Helmet
  Helmet --> RateLimit
  RateLimit --> Logger
  Logger --> Handler
  Handler --> Cache
  Cache -->|miss| GeoAPI
  GeoAPI --> WeatherAPI
  WeatherAPI --> Handler
  Handler -->|JSON response| Client
```


### 🔄 Request Lifecycle
```mermaid
sequenceDiagram
    participant C as Client
    participant S as Express Server
    participant G as Geocoding API
    participant W as Weather API

    C->>S: GET /locations/24060
    S->>S: Validate zip (5 digits)
    S->>S: Validate scale param
    S->>G: Fetch lat/lon for zip
    G-->>S: { lat, lon }
    S->>W: Fetch temperature
    W-->>S: { temperature }
    S-->>C: 200 { temperature: 43, scale: "Fahrenheit" }
```

