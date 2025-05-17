import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { DatePickerInput } from '../ui/DatePicker';

// Define form schemas for different data types
const commitmentSchema = z.object({
  date: z.date(),
  calls_committed: z.number().min(0),
  prospects_expected: z.number().min(0),
  meetings_expected: z.number().min(0),
  closures_expected: z.number().min(0),
  expected_revenue: z.number().min(0),
});

const dailyReportSchema = z.object({
  date: z.date(),
  calls_made: z.number().min(0),
  prospects_generated: z.number().min(0),
  meetings_done: z.number().min(0),
  closures_achieved: z.number().min(0),
  revenue_generated: z.number().min(0),
  challenges_faced: z.string().optional(),
});

const prospectSchema = z.object({
  name: z.string().min(1),
  contact_info: z.string().min(1),
  source: z.string().min(1),
  status: z.string().min(1),
  notes: z.string().optional(),
});

const meetingSchema = z.object({
  date: z.date(),
  type: z.enum(['initial', 'followup', 'closing', 'other']),
  product: z.string().min(1),
  expected_revenue: z.number().min(0),
  outcome: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']),
  rescheduled_date: z.date().optional(),
});

const closureSchema = z.object({
  product: z.string().min(1),
  amount: z.number().min(0),
  date_closed: z.date(),
});

const followupSchema = z.object({
  follow_up_date: z.date(),
  status: z.enum(['pending', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

type FormType = 'commitment' | 'dailyReport' | 'prospect' | 'meeting' | 'closure' | 'followup';

interface DataEntryFormProps {
  type: FormType;
  onSubmit: (data: any) => Promise<void>;
  defaultValues?: any;
}

export function DataEntryForm({ type, onSubmit, defaultValues }: DataEntryFormProps) {
  const schema = {
    commitment: commitmentSchema,
    dailyReport: dailyReportSchema,
    prospect: prospectSchema,
    meeting: meetingSchema,
    closure: closureSchema,
    followup: followupSchema,
  }[type];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const renderFields = () => {
    switch (type) {
      case 'commitment':
        return (
          <>
            <DatePickerInput
              name="date"
              control={control}
              label="Date"
              error={errors.date?.message?.toString()}
            />
            <Input
              type="number"
              label="Calls Committed"
              {...register('calls_committed', { valueAsNumber: true })}
              error={errors.calls_committed?.message?.toString()}
            />
            <Input
              type="number"
              label="Prospects Expected"
              {...register('prospects_expected', { valueAsNumber: true })}
              error={errors.prospects_expected?.message?.toString()}
            />
            <Input
              type="number"
              label="Meetings Expected"
              {...register('meetings_expected', { valueAsNumber: true })}
              error={errors.meetings_expected?.message?.toString()}
            />
            <Input
              type="number"
              label="Closures Expected"
              {...register('closures_expected', { valueAsNumber: true })}
              error={errors.closures_expected?.message?.toString()}
            />
            <Input
              type="number"
              label="Expected Revenue"
              {...register('expected_revenue', { valueAsNumber: true })}
              error={errors.expected_revenue?.message?.toString()}
            />
          </>
        );

      case 'dailyReport':
        return (
          <>
            <DatePickerInput
              name="date"
              control={control}
              label="Date"
              error={errors.date?.message?.toString()}
            />
            <Input
              type="number"
              label="Calls Made"
              {...register('calls_made', { valueAsNumber: true })}
              error={errors.calls_made?.message?.toString()}
            />
            <Input
              type="number"
              label="Prospects Generated"
              {...register('prospects_generated', { valueAsNumber: true })}
              error={errors.prospects_generated?.message?.toString()}
            />
            <Input
              type="number"
              label="Meetings Done"
              {...register('meetings_done', { valueAsNumber: true })}
              error={errors.meetings_done?.message?.toString()}
            />
            <Input
              type="number"
              label="Closures Achieved"
              {...register('closures_achieved', { valueAsNumber: true })}
              error={errors.closures_achieved?.message?.toString()}
            />
            <Input
              type="number"
              label="Revenue Generated"
              {...register('revenue_generated', { valueAsNumber: true })}
              error={errors.revenue_generated?.message?.toString()}
            />
            <Textarea
              label="Challenges Faced"
              {...register('challenges_faced')}
              error={errors.challenges_faced?.message?.toString()}
            />
          </>
        );

      case 'prospect':
        return (
          <>
            <Input
              label="Name"
              {...register('name')}
              error={errors.name?.message?.toString()}
            />
            <Input
              label="Contact Info"
              {...register('contact_info')}
              error={errors.contact_info?.message?.toString()}
            />
            <Input
              label="Source"
              {...register('source')}
              error={errors.source?.message?.toString()}
            />
            <Select
              label="Status"
              {...register('status')}
              error={errors.status?.message?.toString()}
              options={[
                { value: 'new', label: 'New' },
                { value: 'contacted', label: 'Contacted' },
                { value: 'qualified', label: 'Qualified' },
                { value: 'proposal', label: 'Proposal' },
                { value: 'negotiation', label: 'Negotiation' },
                { value: 'closed', label: 'Closed' },
                { value: 'lost', label: 'Lost' },
              ]}
            />
            <Textarea
              label="Notes"
              {...register('notes')}
              error={errors.notes?.message?.toString()}
            />
          </>
        );

      case 'meeting':
        return (
          <>
            <DatePickerInput
              name="date"
              control={control}
              label="Date"
              error={errors.date?.message?.toString()}
            />
            <Select
              label="Type"
              {...register('type')}
              error={errors.type?.message?.toString()}
              options={[
                { value: 'initial', label: 'Initial' },
                { value: 'followup', label: 'Follow-up' },
                { value: 'closing', label: 'Closing' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input
              label="Product"
              {...register('product')}
              error={errors.product?.message?.toString()}
            />
            <Input
              type="number"
              label="Expected Revenue"
              {...register('expected_revenue', { valueAsNumber: true })}
              error={errors.expected_revenue?.message?.toString()}
            />
            <Select
              label="Outcome"
              {...register('outcome')}
              error={errors.outcome?.message?.toString()}
              options={[
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'rescheduled', label: 'Rescheduled' },
              ]}
            />
            <DatePickerInput
              name="rescheduled_date"
              control={control}
              label="Rescheduled Date"
              error={errors.rescheduled_date?.message?.toString()}
            />
          </>
        );

      case 'closure':
        return (
          <>
            <Input
              label="Product"
              {...register('product')}
              error={errors.product?.message?.toString()}
            />
            <Input
              type="number"
              label="Amount"
              {...register('amount', { valueAsNumber: true })}
              error={errors.amount?.message?.toString()}
            />
            <DatePickerInput
              name="date_closed"
              control={control}
              label="Date Closed"
              error={errors.date_closed?.message?.toString()}
            />
          </>
        );

      case 'followup':
        return (
          <>
            <DatePickerInput
              name="follow_up_date"
              control={control}
              label="Follow-up Date"
              error={errors.follow_up_date?.message?.toString()}
            />
            <Select
              label="Status"
              {...register('status')}
              error={errors.status?.message?.toString()}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
            <Textarea
              label="Notes"
              {...register('notes')}
              error={errors.notes?.message?.toString()}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {renderFields()}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
} 