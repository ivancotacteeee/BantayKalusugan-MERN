// src/components/DeviceStatusDisplay.js
import React, { useEffect, useState } from 'react';
import { database, ref, onValue } from './firebase';

function DeviceStatusDisplay() {
  const [deviceStatus, setDeviceStatus] = useState(null);
  // Initialize healthData as an object with null values
  const [healthData, setHealthData] = useState({ vitals: null, weight: null });

  useEffect(() => {
    // Flags to track first snapshot
    let firstDeviceStatus = true;
    let firstVitals = true;
    let firstWeight = true;

    // Listen for device status updates
    const deviceStatusRef = ref(database, 'deviceStatus');
    const unsubscribeDeviceStatus = onValue(deviceStatusRef, (snapshot) => {
      if (firstDeviceStatus) {
        firstDeviceStatus = false; // Skip initial snapshot
        return;
      }
      const data = snapshot.val();
      setDeviceStatus(data);
    });

    // Listen for vitals updates
    const vitalsRef = ref(database, 'healthData/vitals');
    const unsubscribeVitals = onValue(vitalsRef, (snapshot) => {
      if (firstVitals) {
        firstVitals = false; // Skip initial snapshot
        return;
      }
      const data = snapshot.val();
      setHealthData(prev => ({ ...prev, vitals: data }));
    });

    // Listen for weight updates
    const weightRef = ref(database, 'healthData/weight');
    const unsubscribeWeight = onValue(weightRef, (snapshot) => {
      if (firstWeight) {
        firstWeight = false; // Skip initial snapshot
        return;
      }
      const data = snapshot.val();
      setHealthData(prev => ({ ...prev, weight: data }));
    });

    // Cleanup listeners
    return () => {
      unsubscribeDeviceStatus();
      unsubscribeVitals();
      unsubscribeWeight();
    };
  }, []);

  return (
    <div>
      <h2>Real-time Device Status</h2>
      {deviceStatus ? (
        <p>Device ID: {deviceStatus.deviceId}, Status: {deviceStatus.status}, Last Updated: {new Date(deviceStatus.timestamp).toLocaleString()}</p>
      ) : (
        <p>No device status updates yet</p>
      )}

      <h2>Real-time Health Data</h2>
      {healthData.vitals || healthData.weight ? (
        <div>
          {healthData.vitals && (
            <>
              <p>Heart Rate: {healthData.vitals.heartRate}</p>
              <p>SpO2: {healthData.vitals.SpO2}</p>
              <p>Vitals Last Updated: {new Date(healthData.vitals.timestamp).toLocaleString()}</p>
            </>
          )}
          {healthData.weight && (
            <>
              <p>Weight: {healthData.weight.weight}</p>
              <p>Weight Last Updated: {new Date(healthData.weight.timestamp).toLocaleString()}</p>
            </>
          )}
        </div>
      ) : (
        <p>No health data updates yet</p>
      )}
    </div>
  );
}

export default DeviceStatusDisplay;