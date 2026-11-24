-- CreateEnum
CREATE TYPE "TrainingCourse" AS ENUM ('I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL', 'XLI', 'XLII', 'XLIII', 'XLIV', 'XLV', 'XLVI', 'XLVII', 'XLVIII', 'XLIX', 'L');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "additionalCourses" TEXT[],
ADD COLUMN     "graduationYear" INTEGER,
ADD COLUMN     "trainingCourse" "TrainingCourse",
ADD COLUMN     "trainingSchool" VARCHAR(100),
ADD COLUMN     "trainingSpecialty" VARCHAR(100);

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "graduationYear" INTEGER,
ADD COLUMN     "trainingCourse" "TrainingCourse",
ADD COLUMN     "trainingSchool" VARCHAR(100);
