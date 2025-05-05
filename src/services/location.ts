import type { LocationCoords } from '@/types'; // Import correct type

/**
 * Asynchronously retrieves the current geographical location of the device
 * using the browser's Geolocation API.
 *
 * @returns A promise that resolves to a LocationCoords object containing latitude and longitude.
 * @throws Error if geolocation is not supported or permission is denied.
 */
export async function getCurrentLocation(): Promise<LocationCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let message = "Could not retrieve location.";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = "User denied the request for Geolocation.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            message = "The request to get user location timed out.";
            break;
          // case error.UNKNOWN_ERROR: // Deprecated/Less common
          //   message = "An unknown error occurred.";
          //   break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true, // Request more accurate position
        timeout: 10000, // Maximum time (in milliseconds) to wait for a response (10 seconds)
        maximumAge: 0 // Do not use a cached position
      }
    );
  });
}
