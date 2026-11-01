module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      'react-native-maps',
      {
        iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY,
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          enableSceneSupport: true,
        },
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission:
          'O Rota Otimizada precisa do microfone para transcrever endereços ditados.',
        speechRecognitionPermission:
          'O Rota Otimizada usa o reconhecimento de voz para preencher o endereço informado.',
        androidSpeechServicePackages: [
          'com.google.android.googlequicksearchbox',
          'com.google.android.tts',
        ],
      },
    ],
  ],
});
