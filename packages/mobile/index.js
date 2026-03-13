// This MUST be the first import — crypto polyfill for BundleNudge
import "react-native-get-random-values";

import { registerRootComponent } from "expo";
import { RootNavigator } from "./src/navigation/RootNavigator";

registerRootComponent(RootNavigator);
