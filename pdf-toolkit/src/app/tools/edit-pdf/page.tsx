
import { Navbar } from "../../Components/Navbar";
import { Footer } from "../../Components/Footer";
import { EditPdfTool } from "../../Components/tools/EditPdfTool";
import { FileEdit, ShieldCheck } from "lucide-react";

export default function EditPdfPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <FileEdit size={32} />
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Edit PDF
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-gray-600">
              Add text, insert images, draw shapes, highlight important
              information, and annotate your PDF documents.
            </p>
          </div>

          <EditPdfTool />

          <div
            id="privacy"
            className="mt-6 flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4"
          >
            <ShieldCheck
              size={22}
              className="mt-0.5 shrink-0 text-green-600"
            />

            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Your files deserve care
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                This editor processes your PDF in your browser. Your original
                file is not intentionally uploaded to our conversion backend
                by this editor. Downloaded changes are saved as a new PDF.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
