import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ParsePdfFilePipe
  implements PipeTransform<Express.Multer.File | undefined, Express.Multer.File>
{
  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) {
      throw new BadRequestException("A PDF file is required.");
    }

    if (file.mimetype !== "application/pdf") {
      throw new BadRequestException("Only PDF files are allowed.");
    }

    // PDF files normally begin with "%PDF-".
    const pdfSignature = Buffer.from("%PDF-");
    const fileSignature = file.buffer.subarray(0, pdfSignature.length);

    if (!fileSignature.equals(pdfSignature)) {
      throw new BadRequestException("The uploaded file is not a valid PDF.");
    }

    return file;
  }
}
