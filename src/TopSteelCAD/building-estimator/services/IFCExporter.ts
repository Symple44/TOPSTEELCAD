/**
 * Service d'export IFC (Industry Foundation Classes)
 * Génère des fichiers IFC au format STEP (ISO 10303-21)
 * Building Estimator - TopSteelCAD
 */

import {
  MonoPenteBuilding,
  StructuralElement,
  StructuralElementType,
  Opening,
  OpeningType
} from '../types/building.types';
import {
  IFCExportOptions,
  IFCExportResult,
  IFCSchemaVersion,
  IFCProfileType
} from '../types/ifc.types';
import { ProfileIFCMapper } from './ProfileIFCMapper';

/**
 * Service d'export IFC
 */
export class IFCExporter {
  private nextId = 1;
  private lines: string[] = [];
  private entities: Map<number, string> = new Map();

  /**
   * Exporte un bâtiment au format IFC
   */
  static exportBuilding(
    building: MonoPenteBuilding,
    options?: IFCExportOptions
  ): IFCExportResult {
    const exporter = new IFCExporter();

    try {
      const opts: Required<IFCExportOptions> = {
        schemaVersion: IFCSchemaVersion.IFC2X3,
        projectName: building.name || 'Steel Building Project',
        projectDescription: `Bâtiment métallique ${building.dimensions.length / 1000}x${building.dimensions.width / 1000}m`,
        siteName: 'Site',
        buildingName: building.name,
        latitude: 0,
        longitude: 0,
        elevation: 0,
        includeGeometry: true,
        geometryPrecision: 3,
        tessellationQuality: 'medium',
        includeMaterials: true,
        includeProperties: true,
        includeQuantities: true,
        includeClassifications: false,
        groupByStorey: true,
        groupByType: false,
        optimizeGeometry: true,
        mergeIdenticalProfiles: true,
        ...options
      };

      const ifcContent = exporter.generate(building, opts);

      return {
        success: true,
        ifcContent,
        fileName: `${building.name.replace(/\s+/g, '_')}.ifc`,
        fileSize: new Blob([ifcContent]).size,
        entityCount: exporter.nextId - 1,
        warnings: [],
        errors: [],
        metadata: {
          schemaVersion: opts.schemaVersion,
          timestamp: new Date(),
          application: 'TopSteelCAD Building Estimator',
          applicationVersion: '1.0.0'
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metadata: {
          schemaVersion: options?.schemaVersion || IFCSchemaVersion.IFC2X3,
          timestamp: new Date(),
          application: 'TopSteelCAD Building Estimator',
          applicationVersion: '1.0.0'
        }
      };
    }
  }

  /**
   * Génère le contenu IFC complet
   */
  private generate(building: MonoPenteBuilding, options: Required<IFCExportOptions>): string {
    // Header
    this.generateHeader(building, options);

    // DATA section
    this.lines.push('DATA;');

    // Structure hiérarchique
    const projectId = this.createProject(options);
    const siteId = this.createSite(projectId, options);
    const buildingId = this.createBuilding(siteId, building, options);
    const storeyId = this.createBuildingStorey(buildingId, options);

    // Contexte géométrique
    const contextId = this.createGeometricContext(options);

    // Matériaux
    const steelMaterialId = this.createMaterial('Steel', options);

    // Éléments structurels
    const elementIds: number[] = [];

    // Poteaux
    for (const post of building.structure.posts) {
      const id = this.createElement(
        post,
        'COLUMN',
        contextId,
        steelMaterialId,
        options
      );
      elementIds.push(id);
    }

    // Arbalétriers
    for (const rafter of building.structure.rafters) {
      const id = this.createElement(
        rafter,
        'BEAM',
        contextId,
        steelMaterialId,
        options
      );
      elementIds.push(id);
    }

    // Pannes
    for (const purlin of building.structure.purlins) {
      const id = this.createElement(
        purlin,
        'BEAM',
        contextId,
        steelMaterialId,
        options
      );
      elementIds.push(id);
    }

    // Lisses
    for (const rail of building.structure.rails) {
      const id = this.createElement(
        rail,
        'MEMBER',
        contextId,
        steelMaterialId,
        options
      );
      elementIds.push(id);
    }

    // Relation contenu dans l'étage
    this.createRelContainedInSpatialStructure(storeyId, elementIds);

    // Ouvertures
    if (building.openings && building.openings.length > 0) {
      for (const opening of building.openings) {
        this.createOpening(opening, storeyId, contextId, options);
      }
    }

    // Fin DATA
    this.lines.push('ENDSEC;');
    this.lines.push('END-ISO-10303-21;');

    return this.lines.join('\n');
  }

  /**
   * Génère le header IFC
   */
  private generateHeader(building: MonoPenteBuilding, options: Required<IFCExportOptions>): void {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0] + 'T' + now.toISOString().split('T')[1].split('.')[0];

    this.lines.push('ISO-10303-21;');
    this.lines.push('HEADER;');
    this.lines.push(`FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');`);
    this.lines.push(
      `FILE_NAME('${building.name}.ifc','${timestamp}',(''),(''),'TopSteelCAD Building Estimator','TopSteelCAD v1.0.0','');`
    );
    this.lines.push(`FILE_SCHEMA(('${options.schemaVersion}'));`);
    this.lines.push('ENDSEC;');
  }

  /**
   * Crée l'entité Project
   */
  private createProject(options: Required<IFCExportOptions>): number {
    const id = this.getId();
    const guid = this.createGUID();

    this.addEntity(
      id,
      `IFCPROJECT('${guid}',#${this.createOwnerHistory()},'${options.projectName}','${options.projectDescription}',$,$,$,#${this.createUnitsInContext()},#${this.createGeometricContext(options)});`
    );

    return id;
  }

  /**
   * Crée l'entité Site
   */
  private createSite(projectId: number, options: Required<IFCExportOptions>): number {
    const id = this.getId();
    const guid = this.createGUID();
    const placementId = this.createAxis2Placement3D([0, 0, 0]);

    this.addEntity(
      id,
      `IFCSITE('${guid}',#${this.createOwnerHistory()},'${options.siteName}','',$,#${this.createLocalPlacement(null, placementId)},$,$,.ELEMENT.,$,$,$,$,$);`
    );

    // Relation aggregation Project->Site
    this.addEntity(
      this.getId(),
      `IFCRELAGGREGATES('${this.createGUID()}',#${this.createOwnerHistory()},$,$,#${projectId},(#${id}));`
    );

    return id;
  }

  /**
   * Crée l'entité Building
   */
  private createBuilding(siteId: number, building: MonoPenteBuilding, options: Required<IFCExportOptions>): number {
    const id = this.getId();
    const guid = this.createGUID();
    const placementId = this.createAxis2Placement3D([0, 0, 0]);

    this.addEntity(
      id,
      `IFCBUILDING('${guid}',#${this.createOwnerHistory()},'${options.buildingName}','',$,#${this.createLocalPlacement(null, placementId)},$,$,.ELEMENT.,$,$,$);`
    );

    // Relation aggregation Site->Building
    this.addEntity(
      this.getId(),
      `IFCRELAGGREGATES('${this.createGUID()}',#${this.createOwnerHistory()},$,$,#${siteId},(#${id}));`
    );

    return id;
  }

  /**
   * Crée l'entité BuildingStorey
   */
  private createBuildingStorey(buildingId: number, options: Required<IFCExportOptions>): number {
    const id = this.getId();
    const guid = this.createGUID();
    const placementId = this.createAxis2Placement3D([0, 0, 0]);

    this.addEntity(
      id,
      `IFCBUILDINGSTOREY('${guid}',#${this.createOwnerHistory()},'Ground Floor','',$,#${this.createLocalPlacement(null, placementId)},$,$,.ELEMENT.,0.);`
    );

    // Relation aggregation Building->Storey
    this.addEntity(
      this.getId(),
      `IFCRELAGGREGATES('${this.createGUID()}',#${this.createOwnerHistory()},$,$,#${buildingId},(#${id}));`
    );

    return id;
  }

  /**
   * Crée un élément structurel
   */
  private createElement(
    element: StructuralElement,
    ifcType: 'COLUMN' | 'BEAM' | 'MEMBER',
    contextId: number,
    materialId: number,
    options: Required<IFCExportOptions>
  ): number {
    const id = this.getId();
    const guid = this.createGUID();

    // Placement
    const placementId = this.createAxis2Placement3D([
      element.position.x,
      element.position.y,
      element.position.z
    ]);
    const localPlacementId = this.createLocalPlacement(null, placementId);

    // Représentation (simplifiée)
    let representationId = null;
    if (options.includeGeometry) {
      representationId = this.createExtrudedRepresentation(element, contextId, options);
    }

    // Créer l'élément selon le type
    const elementType = `IFC${ifcType}`;
    const representationRef = representationId ? `#${representationId}` : '$';

    this.addEntity(
      id,
      `${elementType}('${guid}',#${this.createOwnerHistory()},'${element.reference || element.type}','${element.profile}',$,#${localPlacementId},${representationRef},$);`
    );

    // Association matériau
    if (options.includeMaterials) {
      this.createRelAssociatesMaterial(id, materialId);
    }

    // Property set
    if (options.includeProperties) {
      this.createPropertySet(id, element);
    }

    return id;
  }

  /**
   * Crée une représentation extrudée pour un élément
   */
  private createExtrudedRepresentation(
    element: StructuralElement,
    contextId: number,
    options: Required<IFCExportOptions>
  ): number {
    // Créer le profil précis selon le type
    const profileId = this.createProfileDefinition(element.profile);

    // Direction d'extrusion
    const directionId = this.createDirection([0, 0, 1]);

    // Position du profil
    const positionId = this.createAxis2Placement3D([0, 0, 0]);

    // Extrusion
    const extrusionId = this.getId();
    this.addEntity(
      extrusionId,
      `IFCEXTRUDEDAREASOLID(#${profileId},#${positionId},#${directionId},${element.length.toFixed(options.geometryPrecision)});`
    );

    // Shape representation
    const shapeRepId = this.getId();
    this.addEntity(
      shapeRepId,
      `IFCSHAPEREPRESENTATION(#${contextId},'Body','SweptSolid',(#${extrusionId}));`
    );

    // Product definition shape
    const productShapeId = this.getId();
    this.addEntity(productShapeId, `IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}));`);

    return productShapeId;
  }

  /**
   * Crée une ouverture
   */
  private createOpening(
    opening: Opening,
    storeyId: number,
    contextId: number,
    options: Required<IFCExportOptions>
  ): number {
    const id = this.getId();
    const guid = this.createGUID();

    const ifcType = opening.type === OpeningType.DOOR ? 'IFCDOOR' : 'IFCWINDOW';

    const placementId = this.createAxis2Placement3D([
      opening.position.x,
      opening.position.y || 0,
      opening.position.z || 0
    ]);
    const localPlacementId = this.createLocalPlacement(null, placementId);

    this.addEntity(
      id,
      `${ifcType}('${guid}',#${this.createOwnerHistory()},'${opening.reference || opening.type}','',$,#${localPlacementId},$,${opening.dimensions.height.toFixed(options.geometryPrecision)},${opening.dimensions.width.toFixed(options.geometryPrecision)});`
    );

    // Relation contenu dans l'étage
    this.createRelContainedInSpatialStructure(storeyId, [id]);

    return id;
  }

  /**
   * Utilitaires
   */

  private getId(): number {
    return this.nextId++;
  }

  private addEntity(id: number, definition: string): void {
    this.entities.set(id, definition);
    this.lines.push(`#${id}=${definition}`);
  }

  private createGUID(): string {
    // IFC GUID (22 caractères base64 modifié)
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
    let guid = '';
    for (let i = 0; i < 22; i++) {
      guid += chars[Math.floor(Math.random() * chars.length)];
    }
    return guid;
  }

  private createOwnerHistory(): number {
    const id = this.getId();
    const personOrgId = this.createPersonAndOrganization();
    const appId = this.createApplication();
    const now = Math.floor(Date.now() / 1000);

    this.addEntity(
      id,
      `IFCOWNERHISTORY(#${personOrgId},#${appId},$,.ADDED.,${now},#${personOrgId},#${appId},${now});`
    );

    return id;
  }

  private createPersonAndOrganization(): number {
    const personId = this.getId();
    this.addEntity(personId, `IFCPERSON($,'User',$,$,$,$,$,$);`);

    const orgId = this.getId();
    this.addEntity(orgId, `IFCORGANIZATION($,'TopSteelCAD',$,$,$);`);

    const id = this.getId();
    this.addEntity(id, `IFCPERSONANDORGANIZATION(#${personId},#${orgId},$);`);

    return id;
  }

  private createApplication(): number {
    const orgId = this.getId();
    this.addEntity(orgId, `IFCORGANIZATION($,'Anthropic',$,$,$);`);

    const id = this.getId();
    this.addEntity(
      id,
      `IFCAPPLICATION(#${orgId},'1.0.0','TopSteelCAD Building Estimator','TSBE');`
    );

    return id;
  }

  private createUnitsInContext(): number {
    const id = this.getId();
    this.addEntity(
      id,
      `IFCUNITASSIGNMENT((#${this.createSIUnit('LENGTHUNIT', 'MILLI', 'METRE')},#${this.createSIUnit('AREAUNIT', $, 'SQUARE_METRE')},#${this.createSIUnit('VOLUMEUNIT', $, 'CUBIC_METRE')},#${this.createSIUnit('MASSUNIT', 'KILO', 'GRAM')}));`
    );

    return id;
  }

  private createSIUnit(unitType: string, prefix: string | null, name: string): number {
    const id = this.getId();
    const prefixStr = prefix ? `.${prefix}.` : '$';
    this.addEntity(id, `IFCSIUNIT(*,.${unitType}.,${prefixStr},.${name}.);`);
    return id;
  }

  private createGeometricContext(options: Required<IFCExportOptions>): number {
    const id = this.getId();
    const originId = this.createCartesianPoint([0, 0, 0]);
    const axisPlacementId = this.createAxis2Placement3D([0, 0, 0]);

    this.addEntity(
      id,
      `IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,${options.geometryPrecision.toFixed(6)},#${axisPlacementId},$);`
    );

    return id;
  }

  private createCartesianPoint(coords: number[]): number {
    const id = this.getId();
    this.addEntity(id, `IFCCARTESIANPOINT((${coords.join(',')}));`);
    return id;
  }

  private createDirection(ratios: number[]): number {
    const id = this.getId();
    this.addEntity(id, `IFCDIRECTION((${ratios.join(',')}));`);
    return id;
  }

  private createAxis2Placement3D(location: number[]): number {
    const id = this.getId();
    const locationId = this.createCartesianPoint(location);
    this.addEntity(id, `IFCAXIS2PLACEMENT3D(#${locationId},$,$);`);
    return id;
  }

  private createLocalPlacement(relativeTo: number | null, axis: number): number {
    const id = this.getId();
    const relativeRef = relativeTo ? `#${relativeTo}` : '$';
    this.addEntity(id, `IFCLOCALPLACEMENT(${relativeRef},#${axis});`);
    return id;
  }

  /**
   * Crée la définition de profil appropriée selon le type
   */
  private createProfileDefinition(profileName: string): number {
    const profileData = ProfileIFCMapper.getProfileDimensions(profileName);
    const positionId = this.createAxis2Placement3D([0, 0, 0]);

    switch (profileData.type) {
      case 'I_SHAPE':
        return this.createIShapeProfile(profileName, profileData.dimensions, positionId);

      case 'U_SHAPE':
        return this.createUShapeProfile(profileName, profileData.dimensions, positionId);

      case 'L_SHAPE':
        return this.createLShapeProfile(profileName, profileData.dimensions, positionId);

      case 'RECTANGLE_HOLLOW':
        return this.createRectangleHollowProfile(profileName, profileData.dimensions, positionId);

      case 'CIRCLE_HOLLOW':
        return this.createCircleHollowProfile(profileName, profileData.dimensions, positionId);

      default:
        // Fallback: rectangle simple
        return this.createRectangleProfile(
          profileName,
          profileData.dimensions.width,
          profileData.dimensions.height,
          positionId
        );
    }
  }

  /**
   * Crée un profil en I (IPE, HEA, HEB, HEM)
   */
  private createIShapeProfile(
    name: string,
    dims: {
      overallWidth: number;
      overallDepth: number;
      webThickness: number;
      flangeThickness: number;
      filletRadius?: number;
    },
    positionId: number
  ): number {
    const id = this.getId();

    const filletRadius = dims.filletRadius || 0;

    this.addEntity(
      id,
      `IFCISHAPEPROFILEDEF(.AREA.,'${name}',#${positionId},${dims.overallWidth.toFixed(3)},${dims.overallDepth.toFixed(3)},${dims.webThickness.toFixed(3)},${dims.flangeThickness.toFixed(3)},$,${filletRadius > 0 ? filletRadius.toFixed(3) : '$'});`
    );

    return id;
  }

  /**
   * Crée un profil en U (UPN, UAP, UPE)
   */
  private createUShapeProfile(
    name: string,
    dims: {
      depth: number;
      flangeWidth: number;
      webThickness: number;
      flangeThickness: number;
      filletRadius?: number;
    },
    positionId: number
  ): number {
    const id = this.getId();

    const filletRadius = dims.filletRadius || 0;

    this.addEntity(
      id,
      `IFCUSHAPEPROFILEDEF(.AREA.,'${name}',#${positionId},${dims.depth.toFixed(3)},${dims.flangeWidth.toFixed(3)},${dims.webThickness.toFixed(3)},${dims.flangeThickness.toFixed(3)},$,${filletRadius > 0 ? filletRadius.toFixed(3) : '$'});`
    );

    return id;
  }

  /**
   * Crée un profil en L (cornière)
   */
  private createLShapeProfile(
    name: string,
    dims: {
      depth: number;
      width: number;
      thickness: number;
      filletRadius?: number;
    },
    positionId: number
  ): number {
    const id = this.getId();

    const filletRadius = dims.filletRadius || 0;
    const edgeRadius = dims.filletRadius ? dims.filletRadius / 2 : 0;

    this.addEntity(
      id,
      `IFCLSHAPEPROFILEDEF(.AREA.,'${name}',#${positionId},${dims.depth.toFixed(3)},$,${dims.thickness.toFixed(3)},${filletRadius > 0 ? filletRadius.toFixed(3) : '$'},$,${edgeRadius > 0 ? edgeRadius.toFixed(3) : '$'},${dims.width.toFixed(3)});`
    );

    return id;
  }

  /**
   * Crée une section rectangulaire creuse (RHS, SHS)
   */
  private createRectangleHollowProfile(
    name: string,
    dims: {
      width: number;
      height: number;
      wallThickness: number;
      innerFilletRadius?: number;
      outerFilletRadius?: number;
    },
    positionId: number
  ): number {
    const id = this.getId();

    const innerRadius = dims.innerFilletRadius || 0;
    const outerRadius = dims.outerFilletRadius || 0;

    this.addEntity(
      id,
      `IFCRECTANGLEHOLLOWSECTION(.AREA.,'${name}',#${positionId},${dims.width.toFixed(3)},${dims.height.toFixed(3)},${dims.wallThickness.toFixed(3)},${outerRadius > 0 ? outerRadius.toFixed(3) : '$'},${innerRadius > 0 ? innerRadius.toFixed(3) : '$'});`
    );

    return id;
  }

  /**
   * Crée une section circulaire creuse (CHS)
   */
  private createCircleHollowProfile(
    name: string,
    dims: {
      diameter: number;
      wallThickness: number;
    },
    positionId: number
  ): number {
    const id = this.getId();

    this.addEntity(
      id,
      `IFCCIRCLEHOLLOWSECTION(.AREA.,'${name}',#${positionId},${dims.diameter.toFixed(3)},${dims.wallThickness.toFixed(3)});`
    );

    return id;
  }

  /**
   * Crée un profil rectangulaire simple (fallback)
   */
  private createRectangleProfile(
    name: string,
    xDim: number,
    yDim: number,
    positionId: number
  ): number {
    const id = this.getId();
    this.addEntity(
      id,
      `IFCRECTANGLEPROFILEDEF(.AREA.,'${name}',#${positionId},${xDim.toFixed(3)},${yDim.toFixed(3)});`
    );
    return id;
  }

  private createMaterial(name: string, options: Required<IFCExportOptions>): number {
    const id = this.getId();
    this.addEntity(id, `IFCMATERIAL('${name}');`);
    return id;
  }

  private createRelAssociatesMaterial(elementId: number, materialId: number): void {
    const id = this.getId();
    this.addEntity(
      id,
      `IFCRELASSOCIATESMATERIAL('${this.createGUID()}',#${this.createOwnerHistory()},$,$,(#${elementId}),#${materialId});`
    );
  }

  private createRelContainedInSpatialStructure(storeyId: number, elementIds: number[]): void {
    if (elementIds.length === 0) return;

    const id = this.getId();
    const elementsStr = elementIds.map((id) => `#${id}`).join(',');
    this.addEntity(
      id,
      `IFCRELCONTAINEDINSPATIALSTRUCTURE('${this.createGUID()}',#${this.createOwnerHistory()},$,$,(${elementsStr}),#${storeyId});`
    );
  }

  private createPropertySet(elementId: number, element: StructuralElement): void {
    const propIds: number[] = [];

    // Propriété: Profil
    const profilePropId = this.getId();
    this.addEntity(
      profilePropId,
      `IFCPROPERTYSINGLEVALUE('Profile',$,IFCTEXT('${element.profile}'),$);`
    );
    propIds.push(profilePropId);

    // Propriété: Longueur
    const lengthPropId = this.getId();
    this.addEntity(
      lengthPropId,
      `IFCPROPERTYSINGLEVALUE('Length',$,IFCLENGTHMEASURE(${element.length.toFixed(0)}),$);`
    );
    propIds.push(lengthPropId);

    // Propriété: Poids
    const weightPropId = this.getId();
    this.addEntity(
      weightPropId,
      `IFCPROPERTYSINGLEVALUE('Weight',$,IFCMASSMEASURE(${element.weight.toFixed(2)}),$);`
    );
    propIds.push(weightPropId);

    // Property Set
    const psetId = this.getId();
    const propsStr = propIds.map((id) => `#${id}`).join(',');
    this.addEntity(
      psetId,
      `IFCPROPERTYSET('${this.createGUID()}',#${this.createOwnerHistory()},'Pset_Common',$,(${propsStr}));`
    );

    // Relation
    const relId = this.getId();
    this.addEntity(
      relId,
      `IFCRELDEFINESBYPROPERTIES('${this.createGUID()}',#${this.createOwnerHistory()},$,$,(#${elementId}),#${psetId});`
    );
  }
}
