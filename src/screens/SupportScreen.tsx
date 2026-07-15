import { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupportTicket, getSupportTickets } from "@/services/support";
import { LoadingView } from "@/components/ui/LoadingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme/colors";

export function SupportScreen() {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets"],
    queryFn: getSupportTickets,
  });

  const createMutation = useMutation({
    mutationFn: () => createSupportTicket({ subject, description }),
    onSuccess: () => {
      setSubject("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });

  if (ticketsQuery.isPending) return <LoadingView label="Loading support..." />;
  if (ticketsQuery.isError) {
    return (
      <ErrorState
        message={ticketsQuery.error instanceof Error ? ticketsQuery.error.message : "Failed to load support tickets"}
        onRetry={() => ticketsQuery.refetch()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Create support ticket</Text>
        <TextInput
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
          style={styles.input}
        />
        <TextInput
          placeholder="Describe your issue"
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.textarea]}
        />
        <AppButton
          title="Submit ticket"
          onPress={() => createMutation.mutate()}
          disabled={subject.trim().length < 3 || description.trim().length < 10}
          loading={createMutation.isPending}
        />
      </View>

      <FlatList
        data={ticketsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={ticketsQuery.isRefetching}
            onRefresh={() => ticketsQuery.refetch()}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState title="No tickets yet" />}
        renderItem={({ item }) => (
          <View style={styles.ticketCard}>
            <Text style={styles.ticketSubject}>{item.subject}</Text>
            <Text style={styles.ticketMeta}>Status: {item.status}</Text>
            <Text style={styles.ticketDesc}>{item.description}</Text>
            {item.adminReply ? (
              <Text style={styles.reply}>Admin reply: {item.adminReply}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    gap: 12,
  },
  formCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  formTitle: {
    fontWeight: "700",
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "#fff",
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  list: {
    paddingBottom: 16,
    gap: 12,
  },
  ticketCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  ticketSubject: {
    fontWeight: "700",
    color: colors.text,
  },
  ticketMeta: {
    color: colors.mutedText,
    fontSize: 12,
  },
  ticketDesc: {
    color: colors.text,
  },
  reply: {
    color: colors.primary,
    marginTop: 4,
  },
});
