"use client";

import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ParticipantType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
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
  eventTypeId: z.number().int().positive("Event type is required"),
  durationMinutes: z.number().int().min(15).max(480),
  dateRangeStart: z.date(),
  dateRangeEnd: z.date(),
  participants: z.array(
    z.object({
      type: z.nativeEnum(ParticipantType),
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email"),
    })
  ),
});

type FormValues = z.infer<typeof _formSchema>;

const durationOptions = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

const participantTypeOptions = [
  { value: ParticipantType.CADRE_REQUIRED, label: "Cadre (Required)" },
  { value: ParticipantType.CADRE_OPTIONAL, label: "Cadre (Optional)" },
  { value: ParticipantType.CLIENT, label: "Client" },
];

export default function GroupPollsCreateView() {
  const { t: _t } = useLocale();
  const router = useRouter();

  // Fetch user's event types
  const { data: eventTypesData, isLoading: eventTypesLoading } = trpc.viewer.eventTypes.list.useQuery();

  const form = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      eventTypeId: 0,
      durationMinutes: 60,
      dateRangeStart: new Date(),
      dateRangeEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      participants: [{ type: ParticipantType.CLIENT, name: "", email: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  // Build event type options from fetched data
  // The list query returns an array of event types directly
  const eventTypeOptions = (eventTypesData || []).map((et) => ({
    value: et.id,
    label: `${et.title} (${et.length} min)`,
  }));

  // Auto-fill duration when event type changes
  const handleEventTypeChange = (eventTypeId: number) => {
    form.setValue("eventTypeId", eventTypeId);
    const selectedEventType = (eventTypesData || []).find((et) => et.id === eventTypeId);
    if (selectedEventType) {
      form.setValue("durationMinutes", selectedEventType.length);
    }
  };

  const createMutation = trpc.viewer.groupPolls.create.useMutation({
    onSuccess: (data) => {
      showToast("Poll created successfully!", "success");
      router.push(`/group-polls/${data.id}`);
    },
    onError: (error) => {
      showToast(error.message || "Failed to create poll", "error");
    },
  });

  const onSubmit = (data: FormValues) => {
    // Generate time windows for each day in the date range (9am-5pm by default)
    const windows: { date: Date; startTime: string; endTime: string }[] = [];
    const currentDate = new Date(data.dateRangeStart);
    const endDate = new Date(data.dateRangeEnd);

    while (currentDate <= endDate) {
      // Skip weekends
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

    createMutation.mutate({
      title: data.title,
      description: data.description,
      eventTypeId: data.eventTypeId,
      durationMinutes: data.durationMinutes,
      dateRangeStart: data.dateRangeStart,
      dateRangeEnd: data.dateRangeEnd,
      windows,
      participants: data.participants,
    });
  };

  return (
    <Form form={form} handleSubmit={onSubmit} className="space-y-6">
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

          <SelectField
            label="Event Type"
            placeholder={eventTypesLoading ? "Loading event types..." : "Select an event type"}
            options={eventTypeOptions}
            value={eventTypeOptions.find((opt) => opt.value === form.watch("eventTypeId"))}
            onChange={(opt) => opt && handleEventTypeChange(opt.value)}
            required
            isDisabled={eventTypesLoading || eventTypeOptions.length === 0}
            data-testid="event-type-select"
          />
          {!eventTypesLoading && eventTypeOptions.length === 0 && (
            <p className="text-attention text-sm">
              You need to create an event type first before creating a poll.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField
              label="Meeting Duration"
              options={durationOptions}
              value={durationOptions.find((opt) => opt.value === form.watch("durationMinutes"))}
              onChange={(opt) => form.setValue("durationMinutes", opt?.value || 60)}
            />
          </div>

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
            <p className="text-subtle mt-1 text-sm">
              Time windows will be generated for weekdays (9 AM - 5 PM) within this range.
            </p>
          </div>
        </div>
      </div>

      <div className="border-subtle bg-default rounded-md border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-emphasis text-lg font-medium">Participants</h2>
          <Button
            type="button"
            color="secondary"
            StartIcon="plus"
            onClick={() => append({ type: ParticipantType.CLIENT, name: "", email: "" })}>
            Add Participant
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="border-subtle flex items-center gap-3 rounded-md border p-3">
              <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
                <TextField
                  label={index === 0 ? "Name" : ""}
                  placeholder="John Doe"
                  {...form.register(`participants.${index}.name`)}
                  required
                />
                <EmailField
                  label={index === 0 ? "Email" : ""}
                  placeholder="john@example.com"
                  {...form.register(`participants.${index}.email`)}
                  required
                />
                <SelectField
                  label={index === 0 ? "Type" : ""}
                  options={participantTypeOptions}
                  value={participantTypeOptions.find(
                    (opt) => opt.value === form.watch(`participants.${index}.type`)
                  )}
                  onChange={(opt) =>
                    form.setValue(`participants.${index}.type`, opt?.value || ParticipantType.CLIENT)
                  }
                />
              </div>
              {fields.length > 1 ? (
                <Button
                  type="button"
                  color="destructive"
                  variant="icon"
                  StartIcon="trash-2"
                  onClick={() => remove(index)}
                />
              ) : (
                <div className="w-10" /> // Spacer to keep alignment
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" color="secondary" onClick={() => router.push("/group-polls")}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={createMutation.isPending}
          disabled={!form.watch("eventTypeId") || eventTypesLoading}>
          Create Poll
        </Button>
      </div>
    </Form>
  );
}
