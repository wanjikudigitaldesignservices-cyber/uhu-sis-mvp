import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './services/supabase';
import { runAcademicProgressEngine } from './engine/progress';
import { z } from 'zod';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// IntaSend Webhook Payload Schema
const intasendWebhookSchema = z.object({
  invoice_id: z.string().optional(),
  state: z.string(),
  value: z.number().or(z.string()).transform(Number),
  account: z.string().optional(),
  api_ref: z.string().optional(), // We'll pass the admissions_app.id or student_id here
  mpesa_reference: z.string().optional()
});

app.post('/api/webhooks/mpesa', async (req, res) => {
  try {
    const parsed = intasendWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload structure' });
    }

    const { state, value, api_ref, mpesa_reference } = parsed.data;

    // We only care about COMPLETE states with a valid mpesa reference
    if (state !== 'COMPLETE' || !mpesa_reference) {
      return res.status(200).json({ message: 'Ignored non-complete or missing mpesa ref' });
    }

    // 1. Idempotency Check: Does this payment already exist?
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('mpesa_ref', mpesa_reference)
      .single();

    if (existingPayment) {
      return res.status(200).json({ message: 'Payment already processed' });
    }

    // 2. Identify the purpose of payment via api_ref
    // If it's an admissions application payment, auto-provision the student
    if (api_ref) {
      const { data: application } = await supabase
        .from('admissions_apps')
        .select('*')
        .eq('id', api_ref)
        .single();

      if (application && application.status === 'pending') {
        // Auto-provisioning flow:
        // A. Create Student record (requires creating an auth user if not existing, but they should have one if they applied)
        // Here we'll generate an admission number and insert into students table
        const admissionNo = `UHU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        const { data: student, error: studentError } = await supabase
          .from('students')
          .insert({
            user_id: application.applicant_user_id,
            admission_no: admissionNo,
            program_id: application.program_id,
            cohort: new Date().getFullYear().toString(),
            status: 'active'
          }).select().single();
          
        if (studentError) throw studentError;

        // B. Update Admissions App status to 'accepted'
        await supabase
          .from('admissions_apps')
          .update({ status: 'accepted' })
          .eq('id', application.id);

        // C. Fetch the current active semester for initial provisioning
        const { data: activeSemester } = await supabase
          .from('semesters')
          .select('id')
          .eq('is_active', true)
          .single();

        let currentSemesterId = activeSemester?.id;
        
        // If we found an active semester, provision fee account
        if (currentSemesterId) {
          const { error: feeError } = await supabase
            .from('fee_accounts')
            .insert({
              student_id: student.user_id,
              semester_id: currentSemesterId,
              invoiced_amount: 50000, // example fixed tuition fee
              paid_amount: value
            });
            
          if (!feeError) {
            // D. Record the actual payment
            await supabase
              .from('payments')
              .insert({
                fee_account_id_student: student.user_id,
                fee_account_id_semester: currentSemesterId,
                mpesa_ref: mpesa_reference,
                amount: value,
                status: 'completed'
              });
          }
        }
        
        // We'd also assign the role 'student' to the public.users record
        await supabase
          .from('users')
          .update({ role: 'student' })
          .eq('id', application.applicant_user_id);
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to manually trigger the progress engine (e.g. from Cloud Scheduler)
app.post('/api/jobs/progress-engine', async (req, res) => {
  // In production, verify authorization headers for cron job identity
  try {
    const results = await runAcademicProgressEngine();
    res.status(200).json({ message: 'Progress engine ran successfully', results });
  } catch (error: any) {
    console.error('Progress Engine error:', error);
    res.status(500).json({ error: 'Failed to run progress engine' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`UHU SIS Backend listening on port ${PORT}`);
});
