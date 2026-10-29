import AsyncStorage from '@react-native-async-storage/async-storage';

const ANONYMOUS_ID_KEY = 'anonymous_install_id';

function createAnonymousId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function getOrCreateAnonymousId(): Promise<string> {
  const savedId = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
  if (savedId) return savedId;

  const anonymousId = createAnonymousId();
  await AsyncStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  return anonymousId;
}
