"use client";

import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ParticipantType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog, DialogTrigger } from "@calcom/ui/components/dialog";
import {
  Form,
  TextField,
  TextAreaField,
  SelectField,
  Label,
  EmailField,
} from "@calcom/ui/components/form";
import { DateRangePicker } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const _formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  dateRangeStart: z.date(),
  dateRangeEnd: z.date(),
  existingParticipants: z.array(
    z.object({
      id: z.number(),
      type: z.nativeEnum(ParticipantType),
      name: z.string(),
      email: z.string().email(),
      hasResponded: z.boolean(),
      markedForRemoval: z.boolean().optional(),
    })
  ),
  newParticipants: z.array(
    z.object({
      type: z.nativeEnum(ParticipantType),
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email"),
    })
  ),
});

type FormValues = z.infer<typeof _formSchema>;

interface GroupPollsEditViewProps {
  pollId: number;
}

const participantTypeOptions = [
  { value: ParticipantType.CADRE_REQUIRED, label: "Cadre (Required)" },
  { value: ParticipantType.CADRE_OPTIONAL, label: "Cadre (Optional)" },
  { value: ParticipantType.CLIENT, label: "Client" },
];

export function GroupPollsEditView({ pollId }: GroupPollsEditViewProps) {
  const { t: _t } = useLocale();
  const router = useRouter();

  const { data: poll, isLoading, error } = trpc.viewer.groupPolls.get.useQuery({ id: pollId });

  const form = useForm<FormValues>({
    values: poll
      ? {
          title: poll.title,
          description: poll.description || "",
          dateRangeStart: new Date(poll.dateRangeStart),
          dateRangeEnd: new Date(poll.dateRangeEnd),
          existingParticipants: poll.participants.map((p: { id: number; type: ParticipantType; name: string; email: string; hasResponded: boolean }) => ({
            id: p.id,
            type: p.type,
            name: p.name,
            email: p.email,
            hasResponded: p.hasResponded,
            markedForRemoval: false,
          })),
          newParticipants: [],
        }
      : undefined,
  });

  const {
    fields: existingFields,
    update: updateExisting,
  } = useFieldArray({
    control: form.control,
    name: "existingParticipants",
  });

  const {
    fields: newFields,
    append: appendNew,
    remove: removeNew,
  } = useFieldArray({
    control: form.control,
    name: "newParticipants",
  });

  const updateMutation = trpc.viewer.groupPolls.update.useMutation({
    onSuccess: (data) => {
      showToast(
        `Poll updated! ${data.participantsAdded} added, ${data.participantsRemoved} removed${
          data.windowsReplaced ? ", time windows updated" : ""
        }`,
        "success"
      );
      router.push(`/group-polls/${pollId}`);
    },
    onError: (error) => {
      showToast(error.message || "Failed to update poll", "error");
    },
  });

  const onSubmit = (data: FormValues) => {
    // Find participants marked for removal
    const removeParticipantIds = data.existingParticipants
      .filter((p) => p.markedForRemoval)
      .map((p) => p.id);

    // Check if date range changed
    const originalStart = poll?.dateRangeStart ? new Date(poll.dateRangeStart).toISOString().split("T")[0] : "";
    const originalEnd = poll?.dateRangeEnd ? new Date(poll.dateRangeEnd).toISOString().split("T")[0] : "";
    const newStart = data.dateRangeStart.toISOString().split("T")[0];
    const newEnd = data.dateRangeEnd.toISOString().split("T")[0];
    const dateRangeChanged = originalStart !== newStart || originalEnd !== newEnd;

    // Generate new windows if date range changed
    let windows: { date: Date; startTime: string; endTime: string }[] | undefined;
    if (dateRangeChanged) {
      windows = [];
      const currentDate = new Date(data.dateRangeStart);
      const endDate = new Date(data.dateRangeEnd);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          windows.push({
            date: new Date(currentDate),
            startTime: "09:00",
            endTime: "17:00",
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    updateMutation.mutate({
      id: pollId,
      title: data.title,
      description: data.description || null,
      dateRangeStart: dateRangeChanged ? data.dateRangeStart : undefined,
      dateRangeEnd: dateRangeChanged ? data.dateRangeEnd : undefined,
      addParticipants: data.newParticipants.length > 0 ? data.newParticipants : undefined,
      removeParticipantIds: removeParticipantIds.length > 0 ? removeParticipantIds : undefined,
      windows,
    });
  };

  const toggleRemoval = (index: number) => {
    const current = form.getValues(`existingParticipants.${index}`);
    updateExisting(index, { ...current, markedForRemoval: !current.markedForRemoval });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-subtle">Loading poll...</div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-error mb-4">Failed to load poll</div>
        <Button onClick={() => router.push("/group-polls")}>Back to Polls</Button>
      </div>
    );
  }

  if (poll.status === "BOOKED") {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-error mb-4">Cannot edit a poll that has already been booked</div>
        <Button onClick={() => router.push(`/group-polls/${pollId}`)}>View Poll</Button>
      </div>
    );
  }

  const existingParticipants = form.watch("existingParticipants") || [];
  const activeParticipants = existingParticipants.filter((p) => !p.markedForRemoval);
  const removedParticipants = existingParticipants.filter((p) => p.markedForRemoval);

  return (
    <Form form={form} handleSubmit={onSubmit} className="space-y-6">
      {/* Poll Details */}
      <div className="border-subtle bg-default rounded-md border p-6">
        <h2 className="text-emphasis mb-4 text-lg font-medium">Poll Details</h2>

        <div className="space-y-4">
          <TextField
            label="Title"
            placeholder="e.g., Q4 Planning Meeting"
            {...form.register("title")}
            required
          />

          <TextAreaField
            label="Description (optional)"
            placeholder="Add any additional details about this poll..."
            {...form.register("description")}
            rows={3}
          />

          <div>
            <Label>Date Range</Label>
            <DateRangePicker
              dates={{
                startDate: form.watch("dateRangeStart"),
                endDate: form.watch("dateRangeEnd"),
              }}
              onDatesChange={({ startDate, endDate }) => {
                if (startDate) form.setValue("dateRangeStart", startDate);
                if (endDate) form.setValue("dateRangeEnd", endDate);
              }}
            />
            <p className="text-attention mt-1 text-sm">
              Changing the date range will regenerate time windows and reset all participant responses.
            </p>
          </div>
        </div>
      </div>

      {/* Existing Participants */}
      <div className="border-subtle bg-default rounded-md border p-6">
        <h2 className="text-emphasis mb-4 text-lg font-medium">
          Existing Participants ({activeParticipants.length})
        </h2>

        <div className="space-y-3">
          {existingFields.map((field, index) => {
            const participant = form.watch(`existingParticipants.${index}`);
            if (participant.markedForRemoval) return null;

            return (
              <div
                key={field.id}
                className="border-subtle flex items-center justify-between rounded-md border p-4">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-emphasis font-medium">{participant.name}</div>
                    <div className="text-subtle text-sm">{participant.email}</div>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      participant.type === "CADRE_REQUIRED"
                        ? "bg-emphasis text-emphasis"
                        : participant.type === "CADRE_OPTIONAL"
                        ? "bg-subtle text-subtle"
                        : "bg-info text-info"
                    }`}>
                    {participant.type.replace("_", " ")}
                  </span>
                  {participant.hasResponded && (
                    <span className="text-success text-xs">Responded</span>
                  )}
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button color="destructive" variant="icon" StartIcon="trash-2" />
                  </DialogTrigger>
                  <ConfirmationDialogContent
                    title="Remove Participant"
                    confirmBtnText="Remove"
                    onConfirm={() => toggleRemoval(index)}>
                    <p>
                      Are you sure you want to remove <strong>{participant.name}</strong> from this poll?
                      {participant.hasResponded && (
                        <span className="text-attention block mt-2">
                          This participant has already responded. Their response will be deleted.
                        </span>
                      )}
                    </p>
                  </ConfirmationDialogContent>
                </Dialog>
              </div>
            );
          })}
        </div>

        {removedParticipants.length > 0 && (
          <div className="mt-4 rounded-md bg-error p-3">
            <div className="text-error text-sm font-medium">
              Participants to be removed ({removedParticipants.length}):
            </div>
            <div className="mt-2 space-y-1">
              {existingFields.map((field, index) => {
                const participant = form.watch(`existingParticipants.${index}`);
                if (!participant.markedForRemoval) return null;

                return (
                  <div key={field.id} className="flex items-center justify-between text-sm">
                    <span className="text-error">
                      {participant.name} ({participant.email})
                    </span>
                    <Button
                      type="button"
                      color="secondary"
                      size="sm"
                      onClick={() => toggleRemoval(index)}>
                      Undo
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add New Participants */}
      <div className="border-subtle bg-default rounded-md border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-emphasis text-lg font-medium">Add New Participants</h2>
          <Button
            type="button"
            color="secondary"
            StartIcon="plus"
            onClick={() => appendNew({ type: ParticipantType.CLIENT, name: "", email: "" })}>
            Add Participant
          </Button>
        </div>

        {newFields.length === 0 ? (
          <p className="text-subtle text-sm">No new participants to add.</p>
        ) : (
          <div className="space-y-4">
            {newFields.map((field, index) => (
              <div key={field.id} className="border-subtle flex items-start gap-4 rounded-md border p-4">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <TextField
                      label="Name"
                      placeholder="John Doe"
                      {...form.register(`newParticipants.${index}.name`)}
                      required
                    />
                    <EmailField
                      label="Email"
                      placeholder="john@example.com"
                      {...form.register(`newParticipants.${index}.email`)}
                      required
                    />
                    <SelectField
                      label="Type"
                      options={participantTypeOptions}
                      value={participantTypeOptions.find(
                        (opt) => opt.value === form.watch(`newParticipants.${index}.type`)
                      )}
                      onChange={(opt) =>
                        form.setValue(`newParticipants.${index}.type`, opt?.value || ParticipantType.CLIENT)
                      }
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  color="destructive"
                  variant="icon"
                  StartIcon="trash-2"
                  onClick={() => removeNew(index)}
                  className="mt-6"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" color="secondary" onClick={() => router.push(`/group-polls/${pollId}`)}>
          Cancel
        </Button>
        <Button type="submit" loading={updateMutation.isPending}>
          Save Changes
        </Button>
      </div>
    </Form>
  );
}

export default GroupPollsEditView;
