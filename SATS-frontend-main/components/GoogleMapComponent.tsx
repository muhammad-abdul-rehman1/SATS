import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export interface RoomMapItem {
  _id: string;
  code: string;
  name: string;
  building?: string;
  floor?: string;
  latitude: number;
  longitude: number;
  description?: string;
  roomType: string;
  capacity?: number;
}

interface GoogleMapComponentProps {
  rooms?: RoomMapItem[];
  center?: { latitude: number; longitude: number };
  zoom?: number;
  isPicker?: boolean;
  selectedCoordinate?: { latitude: number; longitude: number };
  selectedRoomId?: string;
  onLocationSelect?: (latitude: number, longitude: number) => void;
  onRoomDetail?: (roomId: string) => void;
  userLocation?: { latitude: number; longitude: number } | null;
}

const DEFAULT_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  'AIzaSyAzCIdLeWQ3lA2MZ0X2FxZEL1siC_gJyc0';

export const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  rooms = [],
  center = { latitude: 31.4013, longitude: 74.2115 },
  zoom = 16,
  isPicker = false,
  selectedCoordinate,
  selectedRoomId,
  onLocationSelect,
  onRoomDetail,
  userLocation,
}) => {
  const webViewRef = useRef<WebView<object>>(null);

  // Send updates to WebView when selectedCoordinate changes in picker mode
  useEffect(() => {
    if (webViewRef.current && isPicker && selectedCoordinate) {
      const script = `
        if (window.updatePickerLocation) {
          window.updatePickerLocation(${selectedCoordinate.latitude}, ${selectedCoordinate.longitude});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [selectedCoordinate, isPicker]);

  // Select room marker when selectedRoomId changes
  useEffect(() => {
    if (webViewRef.current && !isPicker && selectedRoomId) {
      const script = `
        if (window.selectRoom) {
          window.selectRoom(${JSON.stringify(selectedRoomId)});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [selectedRoomId, isPicker]);

  // Center on campus
  useEffect(() => {
    if (webViewRef.current && !isPicker && center) {
      const script = `
        if (window.centerMap) {
          window.centerMap(${center.latitude}, ${center.longitude}, ${zoom});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [center, zoom, isPicker]);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://maps.googleapis.com/maps/api/js?key=${DEFAULT_API_KEY}&libraries=places"></script>
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #e5e3df;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .gm-style .gm-style-iw-c {
      border-radius: 12px !important;
      padding: 8px 12px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
    }
    .gm-style .gm-style-iw-d {
      overflow: hidden !important;
    }
    .popup-title {
      font-size: 15px;
      font-weight: bold;
      color: #1a1a1a;
      margin: 0 0 2px 0;
    }
    .popup-code {
      font-size: 12px;
      color: #666;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .popup-location {
      font-size: 12px;
      color: #444;
      margin-bottom: 4px;
    }
    .popup-type {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      color: white;
      margin-bottom: 6px;
      text-transform: capitalize;
    }
    .popup-btn {
      display: block;
      width: 100%;
      box-sizing: border-box;
      background: #007AFF;
      color: white;
      text-align: center;
      padding: 7px 0;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      margin-top: 6px;
    }
    .popup-btn:active {
      background: #0056b3;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var isPicker = ${isPicker ? 'true' : 'false'};
    var defaultLat = ${center.latitude};
    var defaultLng = ${center.longitude};
    var defaultZoom = ${zoom};
    var roomsData = ${JSON.stringify(rooms)};
    var selectedRoomId = ${selectedRoomId ? JSON.stringify(selectedRoomId) : 'null'};
    var roomMarkers = {};
    var pickerLat = ${selectedCoordinate ? selectedCoordinate.latitude : center.latitude};
    var pickerLng = ${selectedCoordinate ? selectedCoordinate.longitude : center.longitude};

    function getTypeColor(type) {
      switch (type) {
        case 'OFFICE': return '#2196F3';
        case 'MEETING_ROOM': return '#4CAF50';
        case 'STORAGE': return '#FF9800';
        case 'LAB': return '#9C27B0';
        default: return '#757575';
      }
    }

    function createSvgIcon(color, text) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">' +
        '<path d="M17 0C7.61 0 0 7.61 0 17c0 11.75 17 25 17 25s17-13.25 17-25c0-9.39-7.61-17-17-17z" fill="' + color + '" stroke="#ffffff" stroke-width="2"/>' +
        '<circle cx="17" cy="17" r="7" fill="#ffffff"/>' +
        '</svg>';
      return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(34, 42),
        anchor: new google.maps.Point(17, 42)
      };
    }

    var map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: defaultLat, lng: defaultLng },
      zoom: defaultZoom,
      mapTypeControl: true,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy'
    });

    var activeInfoWindow = null;

    if (isPicker) {
      var pickerMarker = new google.maps.Marker({
        position: { lat: pickerLat, lng: pickerLng },
        map: map,
        draggable: true,
        title: 'Selected Location',
        icon: createSvgIcon('#007AFF', '📍'),
        animation: google.maps.Animation.DROP
      });

      pickerMarker.addListener('dragend', function (e) {
        var lat = e.latLng.lat();
        var lng = e.latLng.lng();
        sendToRN({ type: 'LOCATION_SELECT', latitude: lat, longitude: lng });
      });

      map.addListener('click', function (e) {
        var lat = e.latLng.lat();
        var lng = e.latLng.lng();
        pickerMarker.setPosition(e.latLng);
        sendToRN({ type: 'LOCATION_SELECT', latitude: lat, longitude: lng });
      });

      window.updatePickerLocation = function(lat, lng) {
        var pos = new google.maps.LatLng(lat, lng);
        pickerMarker.setPosition(pos);
        map.panTo(pos);
      };
    } else {
      var bounds = new google.maps.LatLngBounds();

      roomsData.forEach(function (room) {
        if (!room.latitude || !room.longitude) return;

        var color = getTypeColor(room.roomType);
        var markerPos = { lat: Number(room.latitude), lng: Number(room.longitude) };
        bounds.extend(markerPos);

        var marker = new google.maps.Marker({
          position: markerPos,
          map: map,
          title: room.name,
          icon: createSvgIcon(color, room.code)
        });

        var locationStr = '';
        if (room.building) locationStr += room.building;
        if (room.floor) locationStr += (locationStr ? ' - ' : '') + 'Floor ' + room.floor;

        var infoContent = '<div style="font-family: -apple-system, Roboto, sans-serif; padding: 4px; min-width: 170px;">' +
          '<h4 class="popup-title">' + (room.name || 'Room') + '</h4>' +
          '<div class="popup-code">#' + (room.code || '') + '</div>' +
          (locationStr ? '<div class="popup-location">📍 ' + locationStr + '</div>' : '') +
          '<div class="popup-type" style="background:' + color + ';">' + (room.roomType ? room.roomType.replace(/_/g, ' ') : 'Room') + '</div>' +
          (room.capacity ? '<div style="font-size:11px;color:#666;margin-bottom:6px;">Capacity: ' + room.capacity + '</div>' : '') +
          '<button class="popup-btn" onclick="onViewRoom(\\'' + room._id + '\\')">View Details</button>' +
          '</div>';

        var infoWindow = new google.maps.InfoWindow({
          content: infoContent
        });

        roomMarkers[room._id] = { marker: marker, infoWindow: infoWindow, pos: markerPos };

        marker.addListener('click', function () {
          if (activeInfoWindow) activeInfoWindow.close();
          infoWindow.open(map, marker);
          activeInfoWindow = infoWindow;
        });

        if (selectedRoomId && room._id === selectedRoomId) {
          setTimeout(function() {
            if (activeInfoWindow) activeInfoWindow.close();
            infoWindow.open(map, marker);
            activeInfoWindow = infoWindow;
            map.setCenter(markerPos);
            map.setZoom(18);
          }, 800);
        }
      });

      if (roomsData.length > 0 && !selectedRoomId) {
        map.fitBounds(bounds);
        var listener = google.maps.event.addListener(map, "idle", function() {
          if (map.getZoom() > 18) map.setZoom(18);
          google.maps.event.removeListener(listener);
        });
      }
    }

    window.centerMap = function(lat, lng, z) {
      map.setCenter({ lat: lat, lng: lng });
      if (z) map.setZoom(z);
    };

    window.selectRoom = function(roomId) {
      var item = roomMarkers[roomId];
      if (item) {
        if (activeInfoWindow) activeInfoWindow.close();
        item.infoWindow.open(map, item.marker);
        activeInfoWindow = item.infoWindow;
        map.setCenter(item.pos);
        map.setZoom(18);
      }
    };

    function onViewRoom(roomId) {
      sendToRN({ type: 'ROOM_DETAIL', roomId: roomId });
    }

    function sendToRN(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }
  </script>
</body>
</html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOCATION_SELECT' && onLocationSelect) {
        onLocationSelect(data.latitude, data.longitude);
      } else if (data.type === 'ROOM_DETAIL' && onRoomDetail) {
        onRoomDetail(data.roomId);
      }
    } catch (e) {
      console.warn('GoogleMapComponent message parse error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView<object>
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading Google Map...</Text>
          </View>
        )}
        onMessage={handleMessage}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5e3df',
  },
  webview: {
    flex: 1,
    backgroundColor: '#e5e3df',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e3df',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
