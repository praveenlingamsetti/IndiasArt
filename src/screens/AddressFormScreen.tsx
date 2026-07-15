import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import * as Location from "expo-location";
import { AppButton } from "@/components/ui/AppButton";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorState } from "@/components/ui/ErrorState";
import { createAddress, getAddresses, updateAddress, type AddressPayload } from "@/services/addresses";
import { colors } from "@/theme/colors";
import type { CartStackParamList, ProfileStackParamList } from "@/navigation/AppNavigator";

type RouteParams = { addressId?: string };
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export function AddressFormScreen() {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList & CartStackParamList>>();
  const route = useRoute<RouteProp<Record<string, RouteParams | undefined>, string>>();
  const queryClient = useQueryClient();
  const addressId = route.params?.addressId;

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddresses,
  });

  const editingAddress = useMemo(
    () => addressesQuery.data?.find((item) => item.id === addressId) ?? null,
    [addressesQuery.data, addressId],
  );

  const [fullName, setFullName] = useState(editingAddress?.fullName ?? "");
  const [phone, setPhone] = useState(editingAddress?.phone ?? "");
  const [addressLine1, setAddressLine1] = useState(editingAddress?.addressLine1 ?? "");
  const [streetLocality, setStreetLocality] = useState(editingAddress?.addressLine2 ?? "");
  const [city, setCity] = useState(editingAddress?.city ?? "");
  const [stateName, setStateName] = useState(editingAddress?.state ?? "");
  const [pincode, setPincode] = useState(editingAddress?.pincode ?? "");
  const [isDefault, setIsDefault] = useState(Boolean(editingAddress?.isDefault));
  const [addressType, setAddressType] = useState<"HOME" | "WORK" | "OTHER">(
    editingAddress?.addressType ?? "HOME",
  );
  const [addressLabel, setAddressLabel] = useState(editingAddress?.addressLabel ?? "");
  const [isLocating, setIsLocating] = useState(false);
  const [statePickerVisible, setStatePickerVisible] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (payload: AddressPayload) => {
      if (editingAddress) {
        return updateAddress(editingAddress.id, payload);
      }
      return createAddress(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  if (addressesQuery.isPending) return <LoadingView label="Loading address form..." />;
  if (addressesQuery.isError) {
    return (
      <ErrorState
        message={addressesQuery.error instanceof Error ? addressesQuery.error.message : "Failed to load addresses"}
        onRetry={() => addressesQuery.refetch()}
      />
    );
  }

  async function handleSave() {
    if (!fullName.trim() || !phone.trim() || !addressLine1.trim() || !city.trim() || !stateName.trim() || !pincode.trim()) {
      Alert.alert("Missing details", "Please fill all required address fields.");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim(),
        addressLine1: addressLine1.trim(),
        streetLocality: streetLocality.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim(),
        isDefault,
        addressType,
        addressLabel: addressType === "OTHER" ? addressLabel.trim() : undefined,
      });
      Alert.alert("Saved", "Address saved successfully.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Save failed", error instanceof Error ? error.message : "Try again");
    }
  }

  async function handleUseCurrentLocation() {
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission required", "Please allow location access to autofill address.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (!geo) {
        Alert.alert("Location unavailable", "Could not resolve your address from GPS.");
        return;
      }

      const line1Parts = [geo.name, geo.street].filter(Boolean);
      const line2Parts = [geo.subregion, geo.district].filter(Boolean);

      setAddressLine1((prev) => prev || line1Parts.join(", "));
      setStreetLocality((prev) => prev || line2Parts.join(", "));
      setCity((prev) => prev || geo.city || geo.subregion || "");
      setStateName((prev) => prev || geo.region || "");
      setPincode((prev) => prev || geo.postalCode || "");

      Alert.alert("Location added", "Address fields were filled from your current location.");
    } catch (error) {
      Alert.alert(
        "Could not fetch location",
        error instanceof Error ? error.message : "Try again.",
      );
    } finally {
      setIsLocating(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.heading}>{editingAddress ? "Edit address" : "Add new address"}</Text>
        <AppButton
          title={isLocating ? "Fetching location..." : "Use current location"}
          variant="outline"
          loading={isLocating}
          disabled={isLocating}
          onPress={handleUseCurrentLocation}
        />

        <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="Full name *" />
        <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholder="Phone *" keyboardType="phone-pad" />
        <TextInput value={addressLine1} onChangeText={setAddressLine1} style={styles.input} placeholder="Address line 1 *" />
        <TextInput value={streetLocality} onChangeText={setStreetLocality} style={styles.input} placeholder="Street / locality" />
        <TextInput value={city} onChangeText={setCity} style={styles.input} placeholder="City *" />
        <Pressable style={styles.input} onPress={() => setStatePickerVisible(true)}>
          <Text style={stateName ? styles.inputValueText : styles.inputPlaceholderText}>
            {stateName || "State *"}
          </Text>
        </Pressable>
        <TextInput value={pincode} onChangeText={setPincode} style={styles.input} placeholder="Pincode *" keyboardType="number-pad" />

        <View style={styles.typeRow}>
          {(["HOME", "WORK", "OTHER"] as const).map((type) => (
            <AppButton
              key={type}
              title={type}
              variant={addressType === type ? "primary" : "outline"}
              onPress={() => setAddressType(type)}
            />
          ))}
        </View>

        {addressType === "OTHER" ? (
          <TextInput value={addressLabel} onChangeText={setAddressLabel} style={styles.input} placeholder="Address label (e.g. Parents Home)" />
        ) : null}

        <View style={styles.defaultRow}>
          <Text style={styles.defaultText}>Set as default address</Text>
          <Switch value={isDefault} onValueChange={setIsDefault} />
        </View>
      </View>

      <AppButton
        title={editingAddress ? "Update address" : "Save address"}
        loading={saveMutation.isPending}
        onPress={handleSave}
      />

      <Modal
        visible={statePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setStatePickerVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select State</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {INDIAN_STATES.map((item) => (
                <Pressable
                  key={item}
                  style={[styles.modalOption, stateName === item && styles.modalOptionActive]}
                  onPress={() => {
                    setStateName(item);
                    setStatePickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      stateName === item && styles.modalOptionTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
    color: colors.text,
    justifyContent: "center",
  },
  inputValueText: {
    color: colors.text,
  },
  inputPlaceholderText: {
    color: colors.mutedText,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  defaultRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  defaultText: {
    color: colors.text,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modalCard: {
    maxHeight: "70%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  modalOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  modalOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  modalOptionText: {
    color: colors.text,
    fontWeight: "500",
  },
  modalOptionTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
});
