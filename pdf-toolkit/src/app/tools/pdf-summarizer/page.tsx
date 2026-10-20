import {Navbar} from "../../Components/Navbar";
import {Footer} from "../../Components/Footer";
import PdfSummarizerTool from "../../Components/tools/PdfSummarizerTool";

export const metadata = {
  title: "AI PDF Summarizer | PDF Toolkit",
  description:
    "Summarize PDF documents and ask questions using a free local AI model.",
};

export default function PdfSummarizerPage() {
  return (
    <>
      <Navbar />
      <PdfSummarizerTool />
      <Footer />
    </>
  );
}