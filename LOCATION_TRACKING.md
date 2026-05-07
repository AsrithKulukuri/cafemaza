# Live Location Tracking - Implementation Guide

## Overview
This feature enables real-time bidirectional location sharing between delivery partners and customers using Leaflet maps and Socket.io for real-time updates.

## Components Created

### 1. **LiveLocationMap** Component (`components/map/LiveLocationMap.tsx`)
Displays a Leaflet map showing:
- Delivery partner location (orange marker with 🚚 icon)
- Customer delivery address (green marker with 📍 icon)
- Polyline connecting the two locations (when both available)
- Real-time status updates

**Props:**
```typescript
interface LiveLocationMapProps {
    deliveryLocation?: DeliveryLocation;
    customerLocation?: CustomerLocation;
    orderStatus?: string;
    showRoute?: boolean;
}
```

### 2. **useGeolocation Hook** (`lib/hooks/useGeolocation.ts`)
Custom React hook for managing device geolocation with polling:
- Gets current location every 5 seconds (configurable)
- Handles permission requests
- Returns location data with accuracy/altitude/speed
- Error handling for permission denied / unavailable

**Usage:**
```typescript
const { location, error, loading } = useGeolocation({
    enabled: trackingActive,
    interval: 5000,
    enableHighAccuracy: true,
    onLocationUpdate: (loc) => console.log(loc),
});
```

### 3. **Location Tracking Utilities** (`lib/locationTracking.ts`)
Socket.io event helpers for location sharing:

- `emitLocationUpdate()` - Send location to other party
- `listenToLocationUpdates()` - Listen for location updates
- `startDeliveryTracking()` - Start polling location for delivery partner (every 5 seconds)
- `stopAllTracking()` - Stop location polling

### 4. **OrderTrackingMap Component** (`components/order-tracking/OrderTrackingMap.tsx`)
For customers to see delivery partner location on order tracking page:
- Shows delivery partner info (name, phone)
- Real-time location updates via Socket.io
- Shows "Waiting for delivery partner..." until location received
- Only visible when status is "out_for_delivery" or "delivered"

### 5. **DeliveryTrackingClient Component** (`app/delivery/tracking/DeliveryTrackingClient.tsx`)
For delivery partners to:
- Start/stop live location sharing
- See customer delivery address on map
- Shows accuracy, last update time
- Permission request handling

### 6. **Delivery Tracking Page** (`app/delivery/tracking/page.tsx`)
Main page displaying tracking UI for delivery partners

## Flow

### Delivery Partner Side
1. Orders assigned → Navigate to `/delivery/tracking/:orderId`
2. Click "Start Live Tracking"
3. Browser requests location permission
4. Every 5 seconds:
   - Get current location via Geolocation API
   - Emit `location_update` event via Socket.io
   - Display on map
5. Click "Stop Tracking" when delivered

### Customer Side
1. Order status changes to "out_for_delivery"
2. `/order-tracking` page shows OrderTrackingMap
3. Listen for `location_update` events on Socket.io
4. Show delivery partner location on map in real-time
5. Display "Live" indicator and last update time

## Socket.io Events

### Backend (`backend/src/server.js`)
```typescript
// Listen for location updates from delivery partner or customer
socket.on("location_update", (data) => {
    // Broadcast to order room
    io.to(`order:${orderId}`).emit("location_update", data);
});
```

### Frontend Events
```typescript
// Emission (Backend → All clients in order room)
socket.emit("location_update", {
    orderId: string;
    userId: string;
    userType: "delivery" | "customer";
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: number;
    // If delivery:
    deliveryPartnerName: string;
    deliveryPartnerPhone?: string;
    // If customer:
    deliveryAddress?: string;
});

// Listening
socket.on("location_update", (data) => {
    // Update map
});
```

## Geolocation Permissions

### Required for Location Sharing
- User must grant location permission
- Only HTTPS or localhost works
- High accuracy mode: slower but more accurate
- Timeout: 8-10 seconds per location request

### User Flow
1. Click "Start Live Tracking"
2. Browser shows permission prompt
3. Grant permission
4. Tracking starts
5. Updates sent every 5 seconds

## Map Display
Both components use Leaflet with OpenStreetMap:
- Orange marker: Delivery partner (current location)
- Green marker: Customer destination (address)
- Dashed orange line: Route between them
- Auto-centers: Midpoint of both locations

## Integration Points

### Order Tracking Page (`app/order-tracking/page.tsx`)
- Added `<OrderTrackingMap />` component
- Shows when order status = "out_for_delivery"
- Receives customer location from order data
- Listens for delivery partner location updates

### Delivery Dashboard
- Create new component showing assigned orders
- Click order → `/delivery/tracking/:orderId`
- Start tracking from there

## Testing

### Local Testing
1. Open two browser windows:
   - Window 1: Delivery partner dashboard
   - Window 2: Customer order tracking page

2. Both must be on same order (join via `socket.emit("join_order", orderId)`)

3. Start tracking on delivery window
4. See live location appear on customer window within 5 seconds

### Requirements
- Location permission granted
- Both clients connected to same Socket.io server
- Both on same order room

## Environment Setup
- No new environment variables needed
- Leaflet/React-Leaflet already installed
- Socket.io already configured

## Performance Considerations
- Location polling: 5 seconds (configurable)
- Map zoom: 15 (good for city-level tracking)
- Accuracy threshold: ~10-50m typical
- Light API calls (only Geolocation API, no external location service)

## Future Enhancements
1. Calculate real distance/ETA using distance matrix API
2. Show route from delivery partner to customer via mapping API
3. Geofencing alerts (e.g., "Delivery partner is 500m away")
4. Historical location trail
5. Multi-stop delivery route preview
6. Push notifications for status changes
