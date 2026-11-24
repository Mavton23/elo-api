-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "biNumber" TEXT NOT NULL,
    "nuit" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "placeOfBirth" TEXT NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Moçambicana',
    "maritalStatus" "MaritalStatus" NOT NULL,
    "memberRank" "MemberRank" NOT NULL,
    "currentPosition" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "unit" TEXT NOT NULL,
    "unitType" "UnitType" NOT NULL,
    "province" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "institutionalEmail" TEXT,
    "officialPhone" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_nip_key" ON "members"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "members_biNumber_key" ON "members"("biNumber");

-- CreateIndex
CREATE UNIQUE INDEX "members_nuit_key" ON "members"("nuit");

-- CreateIndex
CREATE UNIQUE INDEX "members_institutionalEmail_key" ON "members"("institutionalEmail");
