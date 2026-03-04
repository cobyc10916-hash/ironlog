import Purchases from 'react-native-purchases';

const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

export const initPurchases = () => {
  Purchases.configure({ apiKey });
};

export const getOfferings = async () => {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
};

export const purchasePackage = async (pkg) => {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
};

export const restorePurchases = async () => {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
};
