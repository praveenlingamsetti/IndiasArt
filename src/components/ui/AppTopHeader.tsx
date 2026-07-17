import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";

type AppTopHeaderProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  onSearchExpandedChange?: (expanded: boolean) => void;
};

export function AppTopHeader({
  searchValue,
  onSearchChange,
  placeholder = "Search products",
  onSearchExpandedChange,
}: AppTopHeaderProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const searchWidth = useRef(new Animated.Value(44)).current;
  const [expanded, setExpanded] = useState(false);
  const [internalValue, setInternalValue] = useState("");

  const value = searchValue ?? internalValue;
  const setValue = onSearchChange ?? setInternalValue;

  const toggle = (nextExpanded: boolean) => {
    setExpanded(nextExpanded);
    onSearchExpandedChange?.(nextExpanded);
    Animated.timing(searchWidth, {
      toValue: nextExpanded ? 260 : 44,
      duration: 180,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (nextExpanded && finished) {
        inputRef.current?.focus();
      }
    });

    if (!nextExpanded) {
      inputRef.current?.blur();
    }
  };

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View style={styles.brandWrap}>
        <View style={styles.logoBubble}>
          <Text style={styles.logoText}>IA</Text>
        </View>
        {!expanded ? (
          <Text style={styles.brandText}>INDIASART</Text>
        ) : null}
      </View>

      <Animated.View style={[styles.searchShell, { width: searchWidth }]}>
        {expanded ? (
          <>
            <Ionicons name="search-outline" size={18} color={colors.mutedText} />
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              style={styles.searchInput}
              returnKeyType="search"
            />
            <Pressable onPress={() => toggle(false)} style={styles.iconBtn} hitSlop={6}>
              <Ionicons name="close" size={18} color={colors.mutedText} />
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.iconBtn} onPress={() => toggle(true)}>
            <Ionicons name="search-outline" size={20} color={colors.text} />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  logoBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.primary,
  },
  brandText: {
    fontWeight: "900",
    letterSpacing: 0.6,
    color: colors.text,
  },
  searchShell: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 0,
  },
  iconBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
