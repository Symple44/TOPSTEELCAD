/**
 * Constructeur de nomenclature pour bâtiments
 * Génère la nomenclature complète à partir de la structure
 * Building Estimator - TopSteelCAD
 */

import {
  MonoPenteBuilding,
  StructuralElementType,
  OpeningType
} from '../types/building.types';
import {
  Nomenclature,
  NomenclatureSection,
  NomenclatureItem,
  NomenclatureTotals,
  NomenclatureCategory,
  Unit,
  NomenclatureOptions
} from '../types/nomenclature.types';
import { FrameCalculator } from './FrameCalculator';

/**
 * Constructeur de nomenclature
 */
export class NomenclatureBuilder {
  /**
   * Construit la nomenclature complète à partir d'un bâtiment
   */
  static buildFromBuilding(
    building: MonoPenteBuilding,
    options?: NomenclatureOptions
  ): Nomenclature {
    // Sections de nomenclature
    const mainFrame = this.buildMainFrameSection(building);
    const secondaryFrame = this.buildSecondaryFrameSection(building);
    const cladding = this.buildCladdingSection(building);
    const roofing = this.buildRoofingSection(building);
    const openings = this.buildOpeningsSection(building);

    // Calcul des totaux
    const totals = this.calculateTotals(
      building,
      mainFrame,
      secondaryFrame,
      cladding,
      roofing,
      openings
    );

    return {
      buildingId: building.id,
      buildingName: building.name,
      generatedAt: new Date(),
      version: '1.0',

      sections: {
        mainFrame,
        secondaryFrame,
        cladding,
        roofing,
        openings
      },

      totals,

      metadata: building.metadata
    };
  }

  /**
   * Section ossature principale
   */
  private static buildMainFrameSection(
    building: MonoPenteBuilding
  ): NomenclatureSection {
    const items: NomenclatureItem[] = [];

    // Poteaux
    const posts = building.structure.posts;
    if (posts.length > 0) {
      const postGroups = this.groupByProfile(posts);

      for (const [profile, elements] of Object.entries(postGroups)) {
        const totalLength = elements.reduce((sum, el) => sum + el.length, 0);
        const totalWeight = elements.reduce((sum, el) => sum + el.weight, 0);

        items.push({
          ref: 'POT-01',
          designation: `Poteau ${profile}`,
          profile: profile,
          quantity: elements.length,
          unit: Unit.PIECES,
          unitLength: elements[0].length,
          totalLength: totalLength,
          unitWeight: elements[0].weight,
          totalWeight: totalWeight
        });
      }
    }

    // Arbalétriers
    const rafters = building.structure.rafters;
    if (rafters.length > 0) {
      const rafterGroups = this.groupByProfile(rafters);

      for (const [profile, elements] of Object.entries(rafterGroups)) {
        const totalLength = elements.reduce((sum, el) => sum + el.length, 0);
        const totalWeight = elements.reduce((sum, el) => sum + el.weight, 0);

        items.push({
          ref: 'ARB-01',
          designation: `Arbalétrier ${profile}`,
          profile: profile,
          quantity: elements.length,
          unit: Unit.PIECES,
          unitLength: elements[0].length,
          totalLength: totalLength,
          unitWeight: elements[0].weight,
          totalWeight: totalWeight
        });
      }
    }

    // Pannes
    const purlins = building.structure.purlins;
    if (purlins.length > 0) {
      const purlinGroups = this.groupByProfile(purlins);

      for (const [profile, elements] of Object.entries(purlinGroups)) {
        const totalLength = elements.reduce((sum, el) => sum + el.length, 0);
        const totalWeight = elements.reduce((sum, el) => sum + el.weight, 0);

        items.push({
          ref: 'PAN-01',
          designation: `Panne ${profile}`,
          profile: profile,
          quantity: elements.length,
          unit: Unit.PIECES,
          unitLength: elements[0].length,
          totalLength: totalLength,
          unitWeight: elements[0].weight,
          totalWeight: totalWeight
        });
      }
    }

    // Calcul sous-totaux
    const subtotals = {
      totalWeight: items.reduce((sum, item) => sum + (item.totalWeight || 0), 0),
      totalLength: items.reduce((sum, item) => sum + (item.totalLength || 0), 0)
    };

    return {
      title: 'OSSATURE PRINCIPALE',
      category: NomenclatureCategory.MAIN_FRAME,
      items,
      subtotals
    };
  }

  /**
   * Section ossature secondaire
   */
  private static buildSecondaryFrameSection(
    building: MonoPenteBuilding
  ): NomenclatureSection {
    const items: NomenclatureItem[] = [];

    // Lisses de bardage
    const rails = building.structure.rails;
    if (rails.length > 0) {
      const railGroups = this.groupByProfile(rails);

      for (const [profile, elements] of Object.entries(railGroups)) {
        const totalLength = elements.reduce((sum, el) => sum + el.length, 0);
        const totalWeight = elements.reduce((sum, el) => sum + el.weight, 0);

        items.push({
          ref: 'LIS-01',
          designation: `Lisse de bardage ${profile}`,
          profile: profile,
          quantity: elements.length,
          unit: Unit.PIECES,
          unitLength: elements[0].length,
          totalLength: totalLength,
          unitWeight: elements[0].weight,
          totalWeight: totalWeight
        });
      }
    }

    // Calcul sous-totaux
    const subtotals = {
      totalWeight: items.reduce((sum, item) => sum + (item.totalWeight || 0), 0),
      totalLength: items.reduce((sum, item) => sum + (item.totalLength || 0), 0)
    };

    return {
      title: 'OSSATURE SECONDAIRE',
      category: NomenclatureCategory.SECONDARY_FRAME,
      items,
      subtotals
    };
  }

  /**
   * Section bardage
   */
  private static buildCladdingSection(
    building: MonoPenteBuilding
  ): NomenclatureSection {
    const items: NomenclatureItem[] = [];

    // Calcul surfaces
    const heightRidge = FrameCalculator.calculateHeightRidge(
      building.dimensions.heightWall,
      building.dimensions.width,
      building.dimensions.slope
    );

    const { totalCladdingArea, netCladdingArea } =
      FrameCalculator.calculateCladdingAreas(
        building.dimensions,
        heightRidge,
        building.openings
      );

    // Panneau de bardage
    items.push({
      ref: 'BAR-01',
      designation: `Bardage ${building.finishes.cladding.type}`,
      quantity: Math.ceil(netCladdingArea),
      unit: Unit.SQUARE_METER,
      notes: `Surface brute: ${totalCladdingArea.toFixed(2)} m²`
    });

    // Accessoires (estimation 10% de la surface)
    items.push({
      ref: 'BAR-ACC',
      designation: 'Accessoires bardage (angles, bavettes)',
      quantity: Math.ceil(netCladdingArea * 0.1),
      unit: Unit.SQUARE_METER
    });

    // Calcul sous-totaux
    const subtotals = {
      totalArea: netCladdingArea
    };

    return {
      title: 'BARDAGE',
      category: NomenclatureCategory.CLADDING,
      items,
      subtotals
    };
  }

  /**
   * Section couverture
   */
  private static buildRoofingSection(
    building: MonoPenteBuilding
  ): NomenclatureSection {
    const items: NomenclatureItem[] = [];

    // Calcul surfaces
    const rafterLength = FrameCalculator.calculateRafterLength(
      building.dimensions.width,
      building.dimensions.slope
    );

    const { totalRoofingArea } = FrameCalculator.calculateRoofingAreas(
      building.dimensions,
      rafterLength
    );

    // Panneaux de couverture
    items.push({
      ref: 'COU-01',
      designation: `Couverture ${building.finishes.roofing.type}`,
      quantity: Math.ceil(totalRoofingArea),
      unit: Unit.SQUARE_METER
    });

    // Faîtage
    items.push({
      ref: 'COU-FAI',
      designation: 'Faîtage',
      quantity: Math.ceil(building.dimensions.length / 1000),
      unit: Unit.METER
    });

    // Rives (2 côtés)
    items.push({
      ref: 'COU-RIV',
      designation: 'Rives',
      quantity: Math.ceil((rafterLength * 2) / 1000),
      unit: Unit.METER
    });

    // Gouttières (si demandées)
    if (building.parameters.includeGutters) {
      items.push({
        ref: 'COU-GOU',
        designation: 'Gouttière',
        quantity: Math.ceil(building.dimensions.length / 1000),
        unit: Unit.METER
      });
    }

    // Descentes (si demandées)
    if (building.parameters.includeDownspouts) {
      const downspoutCount = Math.ceil(building.dimensions.length / 10000); // 1 tous les 10m
      items.push({
        ref: 'COU-DESC',
        designation: 'Descente EP',
        quantity: downspoutCount,
        unit: Unit.PIECES,
        unitLength: building.dimensions.heightWall
      });
    }

    // Calcul sous-totaux
    const subtotals = {
      totalArea: totalRoofingArea
    };

    return {
      title: 'COUVERTURE',
      category: NomenclatureCategory.ROOFING,
      items,
      subtotals
    };
  }

  /**
   * Section ouvertures
   */
  private static buildOpeningsSection(
    building: MonoPenteBuilding
  ): NomenclatureSection {
    const items: NomenclatureItem[] = [];

    // Grouper par type
    const doorCount = building.openings.filter(
      (o) => o.type === OpeningType.DOOR
    ).length;
    const windowCount = building.openings.filter(
      (o) => o.type === OpeningType.WINDOW
    ).length;

    // Portes
    if (doorCount > 0) {
      items.push({
        ref: 'OUV-P',
        designation: 'Porte',
        quantity: doorCount,
        unit: Unit.PIECES
      });
    }

    // Fenêtres
    if (windowCount > 0) {
      items.push({
        ref: 'OUV-F',
        designation: 'Fenêtre',
        quantity: windowCount,
        unit: Unit.PIECES
      });
    }

    // Cadres métalliques (un par ouverture)
    if (building.openings.length > 0) {
      items.push({
        ref: 'OUV-CAD',
        designation: 'Cadre métallique',
        quantity: building.openings.length,
        unit: Unit.PIECES
      });
    }

    return {
      title: 'OUVERTURES',
      category: NomenclatureCategory.OPENINGS,
      items
    };
  }

  /**
   * Calcule les totaux généraux
   */
  private static calculateTotals(
    building: MonoPenteBuilding,
    mainFrame: NomenclatureSection,
    secondaryFrame: NomenclatureSection,
    cladding: NomenclatureSection,
    roofing: NomenclatureSection,
    openings: NomenclatureSection
  ): NomenclatureTotals {
    // Poids acier
    const mainFrameWeight = mainFrame.subtotals?.totalWeight || 0;
    const secondaryFrameWeight = secondaryFrame.subtotals?.totalWeight || 0;
    const totalSteelWeight = mainFrameWeight + secondaryFrameWeight;

    // Surfaces
    const totalCladdingArea = cladding.subtotals?.totalArea || 0;
    const netCladdingArea = totalCladdingArea;
    const totalRoofingArea = roofing.subtotals?.totalArea || 0;
    const netRoofingArea = totalRoofingArea;

    // Surface ouvertures
    let totalOpeningArea = 0;
    for (const opening of building.openings) {
      totalOpeningArea +=
        (opening.dimensions.width * opening.dimensions.height) / 1_000_000;
    }

    // Comptage ouvertures
    const doorCount = building.openings.filter(
      (o) => o.type === OpeningType.DOOR
    ).length;
    const windowCount = building.openings.filter(
      (o) => o.type === OpeningType.WINDOW
    ).length;

    return {
      totalSteelWeight,
      mainFrameWeight,
      secondaryFrameWeight,
      totalCladdingArea,
      netCladdingArea,
      totalRoofingArea,
      netRoofingArea,
      totalOpeningArea,
      doorCount,
      windowCount
    };
  }

  /**
   * Groupe les éléments par profil
   */
  private static groupByProfile(elements: any[]): Record<string, any[]> {
    return elements.reduce((groups, element) => {
      const profile = element.profile;
      if (!groups[profile]) {
        groups[profile] = [];
      }
      groups[profile].push(element);
      return groups;
    }, {} as Record<string, any[]>);
  }

  /**
   * Exporte la nomenclature en format CSV
   */
  static exportToCSV(nomenclature: Nomenclature): string {
    let csv = 'NOMENCLATURE BATIMENT\n';
    csv += `${nomenclature.buildingName}\n`;
    csv += `Généré le: ${nomenclature.generatedAt.toLocaleDateString()}\n\n`;

    // Pour chaque section
    for (const section of Object.values(nomenclature.sections)) {
      if (!section || section.items.length === 0) continue;

      csv += `\n${section.title}\n`;
      csv += 'Ref;Designation;Profil;Quantité;Unité;Long. unit.;Long. tot.;Poids unit.;Poids tot.\n';

      for (const item of section.items) {
        csv += `${item.ref};`;
        csv += `${item.designation};`;
        csv += `${item.profile || ''};`;
        csv += `${item.quantity};`;
        csv += `${item.unit};`;
        csv += `${item.unitLength || ''};`;
        csv += `${item.totalLength || ''};`;
        csv += `${item.unitWeight || ''};`;
        csv += `${item.totalWeight || ''}\n`;
      }
    }

    // Totaux
    csv += '\n\nTOTAUX\n';
    csv += `Poids acier total;${nomenclature.totals.totalSteelWeight.toFixed(0)} kg\n`;
    csv += `Surface bardage;${nomenclature.totals.netCladdingArea.toFixed(2)} m²\n`;
    csv += `Surface couverture;${nomenclature.totals.netRoofingArea.toFixed(2)} m²\n`;

    return csv;
  }
}
