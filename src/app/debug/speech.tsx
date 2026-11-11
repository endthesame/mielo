import { Redirect } from 'expo-router';
import SpeechScreen from '../../SpeechScreen';

export default function SpeechRoute() {
  return __DEV__ ? <SpeechScreen /> : <Redirect href="/" />;
}
