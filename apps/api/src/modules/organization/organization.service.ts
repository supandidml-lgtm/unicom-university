import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { DatabaseService, DBBrand, DBBranch } from "../../database/database.service";

@Injectable()
export class OrganizationService {
  constructor(private databaseService: DatabaseService) {}

  // Brands
  async getAllBrands() {
    return this.databaseService.brands;
  }

  async getBrandById(id: string) {
    const brand = this.databaseService.brands.find((b) => b.id === id);
    if (!brand) throw new NotFoundException("Brand tidak ditemukan.");
    return brand;
  }

  async createBrand(name: string, code: string, description: string, actorEmail?: string) {
    const existing = this.databaseService.brands.find(
      (b) => b.code.toLowerCase() === code.toLowerCase().trim(),
    );
    if (existing) {
      throw new ConflictException(`Brand dengan kode '${code}' sudah ada.`);
    }

    const brand: DBBrand = {
      id: `brand-${code.toLowerCase().trim()}`,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.databaseService.brands.push(brand);
    this.databaseService.logAudit({
      actorEmail,
      action: "BRAND_CREATED",
      resource: "BRAND",
      resourceId: brand.id,
      details: { name: brand.name, code: brand.code },
    });

    return brand;
  }

  // Branches
  async getAllBranches() {
    return this.databaseService.branches;
  }

  async getBranchById(id: string) {
    const branch = this.databaseService.branches.find((b) => b.id === id);
    if (!branch) throw new NotFoundException("Cabang tidak ditemukan.");
    return branch;
  }

  async createBranch(name: string, code: string, city: string, actorEmail?: string) {
    const existing = this.databaseService.branches.find(
      (b) => b.code.toLowerCase() === code.toLowerCase().trim(),
    );
    if (existing) {
      throw new ConflictException(`Cabang dengan kode '${code}' sudah ada.`);
    }

    const branch: DBBranch = {
      id: `branch-${code.toLowerCase().trim()}`,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      city: city.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.databaseService.branches.push(branch);
    this.databaseService.logAudit({
      actorEmail,
      action: "BRANCH_CREATED",
      resource: "BRANCH",
      resourceId: branch.id,
      details: { name: branch.name, city: branch.city },
    });

    return branch;
  }
}
