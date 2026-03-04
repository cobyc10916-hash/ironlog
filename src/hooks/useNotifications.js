import { useState } from 'react';

export function useNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestPermission = async () => {
    // TODO: implement with expo-notifications
    setPermissionGranted(true);
  };

  const scheduleReminder = async ({ hour = 8, minute = 0 } = {}) => {
    // TODO: schedule daily reminder at given time
  };

  const cancelAll = async () => {
    // TODO: cancel all scheduled notifications
  };

  return { permissionGranted, requestPermission, scheduleReminder, cancelAll };
}
