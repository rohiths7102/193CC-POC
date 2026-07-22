"use client";

import { useActionState, useState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Button, Field, inputCls, DemoTag } from "@/components/ui";
import {
  loginAction, startEnrolmentAction, signContractAction, payCardAction, payDirectDebitAction,
  previewCompanyCheckAction, confirmEmailCodeAction, resendEmailCodeAction,
} from "@/server/actions/public";
import {
  submitIntentAction, bookSessionAction, saveArticleAction, submitVideoBriefAction, savePitchAction,
  bookMainEventAction, updateProfileAction,
} from "@/server/actions/member";
import {
  manualUnlockAction, manualCreditAction, cancelSlotAction, saveLeadAction, manualEnrolAction,
  logSessionAction, expressInterestAction, assignMentorAction, inviteToSummitAction, updatePriceAction,
  createSummitAction, eraseMemberAction, verifyOrgAction,
} from "@/server/actions/staff";

type ActionState = { error?: string } | undefined;
type FormAction = (prev: ActionState, data: FormData) => Promise<ActionState>;

function Submit({ children, variant = "gold", size = "md" }: { children: ReactNode; variant?: "gold" | "ghost" | "dark" | "danger"; size?: "sm" | "md" | "lg" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Working…
        </span>
      ) : children}
    </Button>
  );
}

function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>
  );
}

/* ── Auth ─────────────────────────────────────────────── */

export function LoginForm() {
  const [state, action] = useActionState(loginAction as FormAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email"><input name="email" type="email" required autoComplete="email" className={inputCls} placeholder="you@company.com" /></Field>
      <Field label="Password"><input name="password" type="password" required autoComplete="current-password" className={inputCls} placeholder="••••••••" /></Field>
      <FormError error={state?.error} />
      <Submit size="lg">Sign in</Submit>
    </form>
  );
}

/* ── Enrolment wizard ─────────────────────────────────── */

/** Live Companies House preview as the applicant types — the "immediate"
 *  half of "immediate verification": feedback before they even submit.
 *  Reports honestly: an unrecognised number says so rather than inventing
 *  a match. Also surfaces the director check. */
function LiveCompanyCheck({ number, name, applicant }: { number: string; name: string; applicant: string }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof previewCompanyCheckAction>>>(null);
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (number.trim().length < 6 || !name.trim()) { setResult(null); return; }
    setChecking(true);
    timer.current = setTimeout(async () => {
      const r = await previewCompanyCheckAction(number, name, applicant);
      setResult(r); setChecking(false);
    }, 600);
    return () => clearTimeout(timer.current);
  }, [number, name, applicant]);

  if (checking) {
    return <p className="flex items-center gap-1.5 text-xs text-mist"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking Companies House…</p>;
  }
  if (!result) return null;

  return (
    <div className="space-y-1 rounded-lg border hairline bg-ink-800/50 px-3 py-2 text-xs">
      {result.status === "invalid_format" && (
        <p className="flex items-center gap-1.5 text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5" /> That isn't a valid UK company number — 8 digits, or 2 letters + 6 digits.
        </p>
      )}
      {result.status === "active" && (
        <>
          <p className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Found: {result.officialName} — active
          </p>
          {result.nameMatches === false && (
            <p className="flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" /> Registered name differs from what you typed.
            </p>
          )}
          {result.directorMatch === true && (
            <p className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> You are listed as an officer of this company.
            </p>
          )}
          {result.directorMatch === false && (
            <p className="flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" /> Your name isn't on this company's officers register — our team will review.
            </p>
          )}
        </>
      )}
      {result.status === "dissolved" && (
        <p className="flex items-center gap-1.5 text-amber-300"><AlertTriangle className="h-3.5 w-3.5" /> {result.officialName} shows as DISSOLVED on the register.</p>
      )}
      {result.status === "not_found" && (
        <p className="flex items-center gap-1.5 text-mist"><XCircle className="h-3.5 w-3.5" /> No company found with that number — you can still submit; our team will verify from your documents.</p>
      )}
      {result.simulated && <span className="block text-[10px] text-mist/60">Demo data — live once a Companies House API key is configured.</span>}
    </div>
  );
}

/** 6-digit email confirmation code. */
export function EmailCodeForm({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(confirmEmailCodeAction as FormAction, undefined);
  const [resent, resendAction] = useActionState(resendEmailCodeAction as FormAction, undefined);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="membershipId" value={membershipId} />
        <Field label="6-digit code">
          <input
            name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            className={`${inputCls} text-center font-mono text-2xl tracking-[0.5em]`}
            placeholder="000000"
          />
        </Field>
        <FormError error={state?.error} />
        <Submit size="lg">Confirm and continue →</Submit>
      </form>
      <form action={resendAction}>
        <input type="hidden" name="membershipId" value={membershipId} />
        <button type="submit" className="text-xs text-gold-300 underline underline-offset-2 hover:text-gold-200">
          Didn't get it? Send a new code
        </button>
        {(resent as { sent?: boolean } | undefined)?.sent && (
          <span className="ml-2 text-xs text-emerald-400">New code sent.</span>
        )}
      </form>
    </div>
  );
}

export function EnrolForm({ productCode, summitCategories, org = false }: {
  productCode: string;
  summitCategories?: { id: string; label: string; slotsLeft: number }[];
  org?: boolean;
}) {
  const [state, action] = useActionState(startEnrolmentAction as FormAction, undefined);
  const [orgName, setOrgName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [applicantName, setApplicantName] = useState("");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="productCode" value={productCode} />
      {org && (
        <div className="rounded-xl border border-gold-500/25 bg-gold-500/8 px-4 py-3 text-sm leading-6 text-ivory-200/90">
          <span className="font-medium text-gold-300">No paperwork.</span> Upload your documents and sign your
          agreement online — around <span className="text-ivory-50">20 minutes</span> end to end, with
          <span className="text-ivory-50"> immediate verification</span> by our team.
        </div>
      )}
      {summitCategories && summitCategories.length > 0 && (
        <Field label="Choose your Summit opportunity" hint="One slot per member — 15 per category. Full categories join the waitlist.">
          <select name="summitCategoryId" required className={inputCls}>
            {summitCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.label} — {c.slotsLeft > 0 ? `${c.slotsLeft} slots left` : "waitlist"}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Full name">
        <input name="name" required value={applicantName} onChange={(e) => setApplicantName(e.target.value)}
          className={inputCls} placeholder="Jane Whitfield" />
      </Field>
      <Field label="Email" hint={org ? "We'll send a confirmation code here. A company address helps verification." : undefined}>
        <input name="email" type="email" required className={inputCls} placeholder="jane@company.com" />
      </Field>
      {org ? (
        <>
          <Field label="Organisation registered name">
            <input name="orgName" required value={orgName} onChange={(e) => setOrgName(e.target.value)}
              className={inputCls} placeholder="Whitfield Industries Ltd" />
          </Field>
          <Field label="Company registration number" hint="We verify this against Companies House — it's required to confirm your organisation.">
            <input name="orgNumber" required value={orgNumber} maxLength={8}
              onChange={(e) => setOrgNumber(e.target.value.toUpperCase())}
              className={inputCls} placeholder="e.g. 14499310" />
          </Field>
          <LiveCompanyCheck number={orgNumber} name={orgName} applicant={applicantName} />
          <Field label="Organisation documents" hint="Certificate of incorporation, letterhead, or similar — PDF or image, up to 10 MB each.">
            <input name="orgDocs" type="file" multiple required accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="block w-full text-sm text-mist file:mr-4 file:rounded-full file:border-0 file:bg-gold-500/20 file:px-4 file:py-2 file:text-sm file:text-gold-300 hover:file:bg-gold-500/30" />
          </Field>
        </>
      ) : (
        <Field label="Company (optional)"><input name="company" className={inputCls} placeholder="Whitfield Industries Ltd" /></Field>
      )}
      <Field label="Create a password" hint="At least 8 characters — this becomes your member login.">
        <input name="password" type="password" required minLength={8} className={inputCls} placeholder="••••••••" />
      </Field>
      <FormError error={state?.error} />
      <Submit size="lg">Continue to contract →</Submit>
    </form>
  );
}

/** Admin: approve/reject an organisation's documents (verification queue). */
export function VerifyOrgForm({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(verifyOrgAction as FormAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <Field label="Rejection reason (required only to reject)">
        <input name="reason" className={`${inputCls} min-w-64`} placeholder="e.g. document illegible / name mismatch" />
      </Field>
      <button type="submit" name="decision" value="approve"
        className="rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-5 py-2 text-sm font-medium text-ink-950 hover:shadow-glow">
        Approve & activate
      </button>
      <button type="submit" name="decision" value="reject"
        className="rounded-full border border-red-400/40 px-5 py-2 text-sm text-red-300 hover:bg-red-500/10">
        Reject
      </button>
      <FormError error={state?.error} />
    </form>
  );
}

/** Member: public profile editor (logo, photo, bio, slug, visibility). */
export function ProfileForm({ profile }: {
  profile: { slug: string | null; bio: string | null; isPublic: boolean; hasLogo: boolean; hasPhoto: boolean };
}) {
  const [state, action] = useActionState(updateProfileAction as FormAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Your public link" hint="Letters, numbers and dashes — this becomes /profile/your-link.">
        <input name="slug" defaultValue={profile.slug ?? ""} className={inputCls} placeholder="acme-regenerative" />
      </Field>
      <Field label="Short bio (up to 600 characters)">
        <textarea name="bio" rows={3} defaultValue={profile.bio ?? ""} className={inputCls}
          placeholder="Who you are, what your enterprise does, and why it matters." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={profile.hasLogo ? "Replace company logo" : "Company logo"} hint="Square PNG/JPG works best.">
          <input name="logo" type="file" accept="image/*"
            className="block w-full text-sm text-mist file:mr-3 file:rounded-full file:border-0 file:bg-gold-500/20 file:px-3 file:py-1.5 file:text-xs file:text-gold-300" />
        </Field>
        <Field label={profile.hasPhoto ? "Replace profile picture" : "Profile picture"}>
          <input name="photo" type="file" accept="image/*"
            className="block w-full text-sm text-mist file:mr-3 file:rounded-full file:border-0 file:bg-gold-500/20 file:px-3 file:py-1.5 file:text-xs file:text-gold-300" />
        </Field>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-gold-500/20 bg-ink-800/50 px-4 py-3 text-sm text-ivory-200/85">
        <input type="checkbox" name="public" defaultChecked={profile.isPublic} className="mt-0.5 h-4 w-4 accent-[#C6A15B]" />
        <span><strong className="text-ivory-50">Make my profile public.</strong> Anyone with your link can view it — no login needed. Untick any time to take it offline instantly.</span>
      </label>
      <FormError error={state?.error} />
      <Submit>Save profile</Submit>
    </form>
  );
}

export function SignForm({ membershipId }: { membershipId: string }) {
  const [state, action] = useActionState(signContractAction as FormAction, undefined);
  const [name, setName] = useState("");
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="membershipId" value={membershipId} />
      <Field label="Sign by typing your full legal name">
        <input name="signerName" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="Jane Whitfield" />
      </Field>
      {name.trim().length > 1 && (
        <div className="rounded-xl border border-gold-500/25 bg-ink-800/60 px-6 py-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-mist">Signature preview</p>
          <p className="mt-1 font-display text-3xl italic text-gold-grad">{name}</p>
        </div>
      )}
      <label className="flex items-start gap-3 text-sm text-ivory-200/80">
        <input type="checkbox" name="agreed" className="mt-1 h-4 w-4 accent-[#C6A15B]" />
        I confirm I have read the agreement and intend my typed name to be my legally binding electronic signature.
      </label>
      <FormError error={state?.error} />
      <div className="flex items-center gap-3">
        <Submit size="lg">Sign agreement</Submit>
        <DemoTag>Simulated e-signature</DemoTag>
      </div>
    </form>
  );
}

export function PayForms({ membershipId, priceMinor, allowsDirectDebit }: { membershipId: string; priceMinor: number; allowsDirectDebit: boolean }) {
  const [cardState, cardAction] = useActionState(payCardAction as FormAction, undefined);
  const [ddState, ddAction] = useActionState(payDirectDebitAction as FormAction, undefined);
  const [tab, setTab] = useState<"card" | "dd">("card");
  const [months, setMonths] = useState<3 | 6>(6);
  const price = priceMinor / 100;

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <button type="button" onClick={() => setTab("card")}
          className={`rounded-full px-5 py-2 text-sm transition-colors ${tab === "card" ? "bg-gold-500/20 text-gold-300 border border-gold-500/40" : "border border-transparent text-mist hover:text-ivory-100"}`}>
          Pay by card
        </button>
        {allowsDirectDebit && (
          <button type="button" onClick={() => setTab("dd")}
            className={`rounded-full px-5 py-2 text-sm transition-colors ${tab === "dd" ? "bg-gold-500/20 text-gold-300 border border-gold-500/40" : "border border-transparent text-mist hover:text-ivory-100"}`}>
            Direct Debit instalments
          </button>
        )}
      </div>

      {tab === "card" ? (
        <form action={cardAction} className="space-y-4">
          <input type="hidden" name="membershipId" value={membershipId} />
          <Field label="Card number"><input inputMode="numeric" className={inputCls} placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Expiry"><input className={inputCls} placeholder="12/28" defaultValue="12/28" /></Field>
            <Field label="CVC"><input className={inputCls} placeholder="123" defaultValue="123" /></Field>
          </div>
          <FormError error={cardState?.error} />
          <div className="flex items-center gap-3">
            <Submit size="lg">Pay £{price.toLocaleString("en-GB")} now</Submit>
            <DemoTag>Simulated — no real charge</DemoTag>
          </div>
        </form>
      ) : (
        <form action={ddAction} className="space-y-4">
          <input type="hidden" name="membershipId" value={membershipId} />
          <input type="hidden" name="months" value={months} />
          <div className="grid grid-cols-2 gap-3">
            {[3, 6].map((m) => (
              <button key={m} type="button" onClick={() => setMonths(m as 3 | 6)}
                className={`rounded-xl border px-4 py-4 text-left transition-colors ${months === m ? "border-gold-500/60 bg-gold-500/10" : "border-gold-500/15 hover:border-gold-500/40"}`}>
                <p className="font-display text-xl text-ivory-50">{m} months</p>
                <p className="mt-1 text-sm text-mist">£{Math.ceil(priceMinor / m / 100).toLocaleString("en-GB")}/month</p>
              </button>
            ))}
          </div>
          <Field label="Account holder"><input className={inputCls} placeholder="Jane Whitfield" defaultValue="Demo Account Holder" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sort code"><input className={inputCls} placeholder="20-00-00" defaultValue="20-00-00" /></Field>
            <Field label="Account number"><input className={inputCls} placeholder="55779911" defaultValue="55779911" /></Field>
          </div>
          <FormError error={ddState?.error} />
          <div className="flex items-center gap-3">
            <Submit size="lg">Set up mandate & pay first instalment</Submit>
            <DemoTag>Simulated Bacs</DemoTag>
          </div>
        </form>
      )}
    </div>
  );
}

/* ── Member portal ────────────────────────────────────── */

export function BookEventForm({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(bookMainEventAction as FormAction, undefined);
  return (
    <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="eventId" value={eventId} />
      <Submit size="sm">Book your delegate place</Submit>
      <FormError error={state?.error} />
    </form>
  );
}

export function IntentUploadForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState(submitIntentAction as FormAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input name="intentLetter" type="file" accept=".pdf,.doc,.docx"
        className="block w-full text-sm text-mist file:mr-4 file:rounded-full file:border-0 file:bg-gold-500/20 file:px-4 file:py-2 file:text-sm file:text-gold-300 hover:file:bg-gold-500/30" />
      <FormError error={state?.error} />
      <Submit size="sm">Upload intent letter</Submit>
    </form>
  );
}

export function BookSessionForm({ assignmentId }: { assignmentId: string }) {
  const [state, action] = useActionState(bookSessionAction as FormAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <Field label="Date & time"><input name="scheduledAt" type="datetime-local" required className={inputCls} /></Field>
      <Field label="Duration">
        <select name="durationMin" className={inputCls} defaultValue="60">
          <option value="30">30 min</option><option value="60">1 hour</option>
          <option value="90">1.5 hours</option><option value="120">2 hours</option>
        </select>
      </Field>
      <Submit size="md">Book session</Submit>
      <FormError error={state?.error} />
    </form>
  );
}

export function ArticleEditor({ article, maxWords }: {
  article?: { id: string; title: string; body: string; status: string } | null; maxWords: number;
}) {
  const [state, action] = useActionState(saveArticleAction as FormAction, undefined);
  const [body, setBody] = useState(article?.body ?? "");
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const over = words > maxWords;
  const locked = article ? ["APPROVED", "PUBLISHED"].includes(article.status) : false;

  return (
    <form action={action} className="space-y-4">
      {article && <input type="hidden" name="id" value={article.id} />}
      <Field label="Title">
        <input name="title" defaultValue={article?.title} required disabled={locked} className={inputCls} placeholder="How your enterprise is changing the game" />
      </Field>
      <Field label={`Article body — ${words.toLocaleString()} / ${maxWords.toLocaleString()} words`}>
        <textarea name="body" rows={12} disabled={locked} value={body} onChange={(e) => setBody(e.target.value)}
          className={`${inputCls} ${over ? "border-red-400/60" : ""}`} placeholder="Tell your story…" />
      </Field>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
        <div className={`h-full rounded-full transition-all duration-300 ${over ? "bg-red-400" : "bg-gradient-to-r from-gold-400 to-gold-600"}`}
          style={{ width: `${Math.min(100, (words / maxWords) * 100)}%` }} />
      </div>
      <Field label="Images (up to 2, HD)" hint="JPEG or PNG.">
        <input name="images" type="file" accept="image/*" multiple disabled={locked}
          className="block w-full text-sm text-mist file:mr-4 file:rounded-full file:border-0 file:bg-gold-500/20 file:px-4 file:py-2 file:text-sm file:text-gold-300" />
      </Field>
      <FormError error={state?.error} />
      {!locked && (
        <div className="flex gap-3">
          <button type="submit" name="submit" value="false" className="rounded-full border border-gold-500/30 px-6 py-2.5 text-sm text-ivory-100 hover:bg-gold-500/10">Save draft</button>
          <button type="submit" name="submit" value="true" disabled={over} className="rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-2.5 text-sm font-medium text-ink-950 hover:shadow-glow disabled:opacity-50">Submit for review</button>
        </div>
      )}
    </form>
  );
}

export function VideoBriefForm() {
  const [state, action] = useActionState(submitVideoBriefAction as FormAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Production brief" hint="Location, people to feature, key messages, deadline hopes.">
        <textarea name="brief" rows={4} className={inputCls} placeholder="Feature our HQ and CEO interview…" />
      </Field>
      <FormError error={state?.error} />
      <Submit size="sm">Submit brief to production</Submit>
    </form>
  );
}

export function PitchForm({ pitch }: { pitch?: { id: string; title: string; summary: string; visibilityConsent: boolean } | null }) {
  const [state, action] = useActionState(savePitchAction as FormAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {pitch && <input type="hidden" name="id" value={pitch.id} />}
      <Field label="Opportunity title"><input name="title" defaultValue={pitch?.title} required className={inputCls} placeholder="Series A — £4M" /></Field>
      <Field label="Summary for investors"><textarea name="summary" rows={4} defaultValue={pitch?.summary} required className={inputCls} placeholder="Traction, market, raise…" /></Field>
      <Field label="Pitch materials (deck, one-pager)" hint="PDF preferred; visible to investors only with your consent.">
        <input name="materials" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" multiple
          className="block w-full text-sm text-mist file:mr-4 file:rounded-full file:border-0 file:bg-gold-500/20 file:px-4 file:py-2 file:text-sm file:text-gold-300" />
      </Field>
      <label className="flex items-start gap-3 rounded-xl border border-gold-500/20 bg-ink-800/50 px-4 py-3 text-sm text-ivory-200/85">
        <input type="checkbox" name="consent" defaultChecked={pitch?.visibilityConsent} className="mt-0.5 h-4 w-4 accent-[#C6A15B]" />
        <span><strong className="text-ivory-50">Investor visibility consent.</strong> Make this opportunity visible to accredited Investor accounts ahead of the Summit. You can withdraw consent at any time.</span>
      </label>
      <FormError error={state?.error} />
      <Submit>Save opportunity</Submit>
    </form>
  );
}

/* ── Staff ────────────────────────────────────────────── */

export function ReasonForm({ action: act, hiddenFields, label, cta, variant = "ghost", placeholder }: {
  action: "unlock" | "credit" | "cancelSlot"; hiddenFields: Record<string, string>;
  label: string; cta: string; variant?: "gold" | "ghost" | "danger"; placeholder?: string;
}) {
  const map: Record<string, FormAction> = {
    unlock: manualUnlockAction as FormAction,
    credit: manualCreditAction as FormAction,
    cancelSlot: cancelSlotAction as FormAction,
  };
  const [state, formAction] = useActionState(map[act], undefined);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      {Object.entries(hiddenFields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {act === "credit" && (
        <Field label="Amount £ (negative = refund)"><input name="amount" type="number" step="0.01" required className={`${inputCls} w-36`} /></Field>
      )}
      <Field label={label}>
        <input name="reason" required className={`${inputCls} min-w-56`} placeholder={placeholder ?? "Reason (written to audit log)"} />
      </Field>
      <Submit size="sm" variant={variant}>{cta}</Submit>
      <FormError error={state?.error} />
    </form>
  );
}

export function LeadForm({ lead }: { lead?: { id: string; name: string; email: string; company: string | null; stage: string; notes: string | null } | null }) {
  const [state, action] = useActionState(saveLeadAction as FormAction, undefined);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {lead && <input type="hidden" name="id" value={lead.id} />}
      <Field label="Name"><input name="name" defaultValue={lead?.name} required className={inputCls} /></Field>
      <Field label="Email"><input name="email" type="email" defaultValue={lead?.email} required className={inputCls} /></Field>
      <Field label="Company"><input name="company" defaultValue={lead?.company ?? ""} className={inputCls} /></Field>
      <Field label="Stage">
        <select name="stage" defaultValue={lead?.stage ?? "NEW"} className={inputCls}>
          {["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Notes"><textarea name="notes" rows={2} defaultValue={lead?.notes ?? ""} className={inputCls} /></Field>
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Submit size="sm">{lead ? "Update lead" : "Add lead"}</Submit>
        <FormError error={state?.error} />
      </div>
    </form>
  );
}

export function ManualEnrolForm({ products }: { products: { code: string; name: string; priceMinor: number }[] }) {
  const [state, action] = useActionState(manualEnrolAction as FormAction, undefined);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <Field label="Member name"><input name="name" required className={inputCls} /></Field>
      <Field label="Email"><input name="email" type="email" required className={inputCls} /></Field>
      <Field label="Company"><input name="company" className={inputCls} /></Field>
      <Field label="Membership">
        <select name="productCode" className={inputCls}>
          {products.map((p) => <option key={p.code} value={p.code}>{p.name} — £{(p.priceMinor / 100).toLocaleString("en-GB")}</option>)}
        </select>
      </Field>
      <div className="md:col-span-2 flex items-center gap-3">
        <Submit>Start enrolment (same contract & payment gates)</Submit>
        <FormError error={state?.error} />
      </div>
    </form>
  );
}

export function LogSessionForm({ sessionId }: { sessionId: string }) {
  const [state, action] = useActionState(logSessionAction as FormAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      <Field label="Session notes"><input name="notes" className={`${inputCls} min-w-64`} placeholder="Outcomes, next steps…" /></Field>
      <Submit size="sm" variant="ghost">Mark delivered</Submit>
      <FormError error={state?.error} />
    </form>
  );
}

export function AssignMentorForm({ memberId, mentors }: {
  memberId: string; mentors: { id: string; name: string; role: string }[];
}) {
  const [state, action] = useActionState(assignMentorAction as FormAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <Field label="Mentor / Consultant">
        <select name="mentorId" className={inputCls}>
          {mentors.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role.toLowerCase()})</option>)}
        </select>
      </Field>
      <Field label="Track">
        <select name="kind" className={inputCls}>
          <option value="senior">Senior</option>
          <option value="enterprise">Enterprise</option>
          <option value="investment">Investment</option>
        </select>
      </Field>
      <Submit size="sm" variant="ghost">Assign</Submit>
      <FormError error={state?.error} />
    </form>
  );
}

export function InviteSummitForm({ categoryId, members }: {
  categoryId: string; members: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(inviteToSummitAction as FormAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="categoryId" value={categoryId} />
      <Field label="Invite member">
        <select name="memberId" className={`${inputCls} max-w-52`}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <Submit size="sm" variant="ghost">Invite</Submit>
      <FormError error={state?.error} />
    </form>
  );
}

export function CreateSummitForm() {
  const [state, action] = useActionState(createSummitAction as FormAction, undefined);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <Field label="Summit name"><input name="name" required className={inputCls} placeholder="UK Investors Summit — Winter 2026" /></Field>
      <Field label="Venue"><input name="venue" required className={inputCls} placeholder="Westminster, London" /></Field>
      <Field label="Event date & time"><input name="startsAt" type="datetime-local" required className={inputCls} /></Field>
      <Field label="Intent-letter deadline"><input name="deadlineAt" type="datetime-local" required className={inputCls} /></Field>
      <Field label="Slots per category" hint="Presentation, Brand Launch and Award are created automatically.">
        <input name="capacity" type="number" defaultValue={15} min={1} className={inputCls} />
      </Field>
      <div className="flex items-end gap-3">
        <Submit>Create Summit</Submit>
        <FormError error={state?.error} />
      </div>
    </form>
  );
}

export function EraseMemberForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(eraseMemberAction as FormAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Field label="GDPR erasure — reason (audited)" hint="Anonymises identity; financial ledger retained under legal obligation.">
        <input name="reason" required className={`${inputCls} min-w-64`} placeholder="Member requested erasure on…" />
      </Field>
      <Submit size="sm" variant="danger">Erase identity</Submit>
      <FormError error={state?.error} />
    </form>
  );
}

export function PriceForm({ productId, currentMinor }: { productId: string; currentMinor: number }) {
  const [state, action] = useActionState(updatePriceAction as FormAction, undefined);
  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="productId" value={productId} />
      <Field label="Fee £">
        <input name="price" type="number" step="1" min="1" defaultValue={currentMinor / 100} className={`${inputCls} w-28`} />
      </Field>
      <Submit size="sm" variant="ghost">Save</Submit>
      <FormError error={state?.error} />
    </form>
  );
}

export function InterestForm({ pitchId, existingNote }: { pitchId: string; existingNote?: string | null }) {
  const [state, action] = useActionState(expressInterestAction as FormAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="pitchId" value={pitchId} />
      <Field label="Note to the team">
        <input name="note" defaultValue={existingNote ?? ""} className={`${inputCls} min-w-64`} placeholder="Requesting data room…" />
      </Field>
      <Submit size="sm">{existingNote ? "Update interest" : "Express interest"}</Submit>
      <FormError error={state?.error} />
    </form>
  );
}
