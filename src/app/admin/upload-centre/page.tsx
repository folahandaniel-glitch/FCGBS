import Link from "next/link";
import { Download, FolderInput } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { requireStaffPage } from "@/server/http";
import { UploadForm } from "./upload-form";

export default async function UploadCentrePage() {
  await requireStaffPage(["content.manage", "courses.manage"]);
  return (
    <>
      <PageHeader title="Upload centre" description="Put every PDF, Word, PowerPoint and MP3 file and link in one go. The template is optional and forgiving: whatever is mistyped, misplaced or missing is corrected and put where it belongs on the website." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <a href="/api/v1/admin/template" className="flex items-start gap-3 rounded-3xl bg-gradient-to-br from-gold-500 to-amber-600 p-5 text-white shadow-card hover:shadow-lift">
          <Download className="mt-0.5 size-6 shrink-0" aria-hidden />
          <span><b className="block text-lg">1. Download the template</b><span className="text-sm text-white/90">Always up to date with every course, lesson, teaching, question and topic on the site.</span></span>
        </a>
        <div className="flex items-start gap-3 rounded-3xl bg-white p-5 shadow-card ring-1 ring-line"><FolderInput className="mt-0.5 size-6 shrink-0 text-royal-700" aria-hidden /><span><b className="block text-lg text-navy-800">2. Fill it, or skip it</b><span className="text-sm text-ink/80">Name the place and the file (or a link). Leave anything unsure blank. Loose files named like “BIB208 hermeneutics notes.pdf” are placed by their name.</span></span></div>
        <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line"><b className="block text-lg text-navy-800">3. Upload everything</b><span className="text-sm text-ink/80">Template and files together. You get a report of what was fixed and where each item went. <Link href="/admin/attachments" className="font-bold text-royal-700 underline">Edit or add single items</Link></span></div>
      </div>
      <UploadForm />
      <p className="mt-6 text-xs text-muted">The web host accepts about 4 MB per upload request. Upload big audio, slides or video to Google Drive or YouTube and put the link in the template’s Link column. Only PDF, DOCX, PPTX, MP3 (and XLSX/images) are accepted; files are scanned and macros or scripts are refused.</p>
    </>
  );
}
