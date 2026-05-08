# Optimizely Graph API Research Summary

## API Overview

**GraphQL Endpoint:** `https://cg.optimizely.com/content/v2?auth=<TOKEN>` (configured via `NEXT_PUBLIC_GRAPHQL_ENDPOINT`)

**Authentication:** Single-key authentication (included in URL query parameter `auth`)

**Method:** POST with JSON body containing GraphQL query

---

## Branch Schema - Available Fields

The `Branch` content type has the following fields available:

### Core Branch Information
- `_id` (String) - Unique identifier
- `Name` (String) - Branch name (e.g., "Charlotte Downtown")
- `Street` (String) - Street address
- `City` (String) - City name
- `Country` (String) - Full country name (e.g., "United States")
- `CountryCode` (String) - ISO country code (e.g., "US")
- `ZipCode` (String) - Postal code
- `Phone` (String) - Contact phone number
- `Email` (String) - Contact email address

### Geographic Coordinates
- `Coordinates` (String) - Lat/long as comma-separated string (e.g., "35.218630, -80.796530")

### Metadata Fields
- `_metadata` (IContentMetadata) - Content metadata interface
- `_itemMetadata` (_Metadata) - Item metadata
- `_modified` (Date) - Last modified date
- `_score` (Float) - Search relevance score
- `_deleted` (Bool) - Deletion flag
- `_fulltext` ([String]) - Full-text search fields
- `_link` (QueryRef) - Query reference
- `_track` (String) - Tracking identifier
- `_json` (JSON) - Full JSON representation

### CMS Metadata
- `ContentLink` (String)
- `ContentType` (String)
- `Status` (String)
- `RouteSegment` (String)
- `Url` (String)
- `Changed` (String)
- `Created` (String)
- `StartPublish` (String)


## Data Statistics

**Total Branches:** 1,000 branches worldwide

### Geographic Distribution (Sample Analysis)
Based on the first 100 records:
- **United States:** Majority (~70+ branches in sample)
  - Cities: Charlotte, San Antonio, Columbus, San Jose, Minneapolis, New York, Portland, Austin, New Orleans, Chicago, Omaha, Tucson, Pittsburgh, Los Angeles, Albuquerque, Atlanta, Virginia Beach, Orlando, Tampa, Seattle, Philadelphia, Cincinnati, Denver, Nashville, Dallas, San Francisco, Raleigh, Kansas City, Oakland, Washington

- **European Countries:**
  - Netherlands (Amsterdam, Utrecht, Nijmegen, The Hague, Eindhoven)
  - United Kingdom (London, Birmingham, Liverpool, Reading, Nottingham, Southampton, Manchester, Bristol, Glasgow)
  - Sweden (Lund, Västerås, Uppsala, Karlstad, Norrköping, Stockholm, Jönköping)
  - Spain (Madrid)
  - Germany (Frankfurt)
  - Italy (Rome)

- **Other International:**
  - Canada (Ottawa, Toronto, Calgary)
  - Australia (Sydney, Brisbane, Cairns, Geelong)
  - Japan (Tokyo)
  - UAE (Dubai)
  - India (Mumbai)
  - Brazil (São Paulo)
  - Hong Kong
  - New Zealand (Wellington)
  - South Africa (Cape Town)

---

## GraphQL Query Examples

### Basic Query (Fetch all branches with pagination)

```graphql
{
  Branch(limit: 100, skip: 0) {
    total
    items {
      _id
      Name
      Street
      City
      Country
      CountryCode
      ZipCode
      Coordinates
      Phone
      Email
    }
  }
}
```

### Filtering by Country (Example - needs testing)

```graphql
{
  Branch(
    limit: 100
    where: {
      CountryCode: { eq: "US" }
    }
  ) {
    total
    items {
      Name
      City
      Coordinates
    }
  }
}
```

### Search by City (Example - needs testing)

```graphql
{
  Branch(
    limit: 100
    where: {
      City: { eq: "New York" }
    }
  ) {
    items {
      Name
      Street
      Coordinates
    }
  }
}
```

### Full-text Search (Example - needs testing)

```graphql
{
  Branch(
    limit: 100
    where: {
      _fulltext: { contains: "downtown" }
    }
  ) {
    items {
      Name
      City
      Country
    }
  }
}
```

---

## API Limitations

1. **Pagination Limit:** Maximum 100 items per request
2. **Total Items:** 1,000 branches total
3. **Requires 10 requests** to fetch all branches (100 items × 10 requests)

---

## Data Format Notes

### Coordinates Parsing
The `Coordinates` field is a string format: `"latitude, longitude"`

Example: `"35.218630, -80.796530"`

**JavaScript parsing:**
```javascript
const [lat, lng] = coordinates.split(',').map(s => parseFloat(s.trim()));
```

### Phone Number Formats
- US: `(650) 446-6394`
- International:
  - Netherlands: `+31 14 180 2441`
  - UK: `+44 20 7544 4592`
  - Sweden: `+46 8 552 13 33`
  - Canada: `+1 613 2418 3588`
  - Australia: `+61 2 1824 6549`
  - Japan: `+81 3 4412 9002`
  - UAE: `+971 4 5842 9377`
  - India: `+91 22 3956 6044`
  - Germany: `+49 69 9217 5969`
  - Spain: `+34 91 8446 4543`
  - Italy: `+39 06 9473 4006`
  - Brazil: `+55 11 5982 4416`
  - Hong Kong: `+852 3477 4470`
  - New Zealand: `+64 4 6016 1168`
  - South Africa: `+27 21 4405 9157`

### Email Format
All emails follow pattern: `{city}.{number}@brightstreambank.com`

Example: `charlotte.47@brightstreambank.com`

---

## Sample Data Records

```json
{
  "_id": "4f809e30-4bc5-4086-8038-73488ea3e850_en_Published",
  "Name": "Charlotte Downtown",
  "Street": "2180 Union Street",
  "City": "Charlotte",
  "Country": "United States",
  "CountryCode": "US",
  "ZipCode": "58281",
  "Coordinates": "35.218630, -80.796530",
  "Phone": "(650) 446-6394",
  "Email": "charlotte.47@brightstreambank.com"
}
```

```json
{
  "_id": "f17cab67-b98f-4ec5-9647-0d287f621cb7_en_Published",
  "Name": "Amsterdam Station",
  "Street": "Marktstraat 149",
  "City": "Amsterdam",
  "Country": "Netherlands",
  "CountryCode": "NL",
  "ZipCode": "8429 BT",
  "Coordinates": "52.380336, 4.925928",
  "Phone": "+31 14 180 2441",
  "Email": "amsterdam.752@brightstreambank.com"
}
```
