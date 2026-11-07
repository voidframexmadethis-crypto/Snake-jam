import * as THREE from 'three';
import { SkinModelType, SkinDefinition } from './gameTypes';

export interface BuiltSnakeHead {
  headGroup: THREE.Group;
  tongueMesh?: THREE.Mesh;
}

export function buildSnakeProceduralHead(
  primaryColor: string,
  secondaryColor: string,
  glowColor: string,
  modelType: SkinModelType = 'classic',
  isSoftwareGl: boolean = false,
  scale: number = 1.0
): BuiltSnakeHead {
  const group = new THREE.Group();
  let tongue: THREE.Mesh | undefined;

  // ----------------------------------------------------
  // 1. CUTE ANIMALS (CAT / DOGE / PANDA)
  // ----------------------------------------------------
  if (modelType === 'cat') {
    // Rounded cute feline skull
    const skullGeo = new THREE.SphereGeometry(0.85 * scale, 18, 16);
    skullGeo.scale(1.0, 0.85, 1.15);
    const skullMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.6,
      metalness: 0.1,
    });
    const skull = new THREE.Mesh(skullGeo, skullMat);
    skull.position.set(0, 0.5 * scale, 0.2 * scale);
    skull.castShadow = !isSoftwareGl;
    group.add(skull);

    // Muzzle / Snout (Puffy cheeks)
    const snoutGeo = new THREE.SphereGeometry(0.35 * scale, 12, 12);
    snoutGeo.scale(1.4, 0.8, 1.0);
    const snoutMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      roughness: 0.5,
    });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, 0.35 * scale, 0.9 * scale);
    group.add(snout);

    // Small pink nose tip
    const noseGeo = new THREE.ConeGeometry(0.1 * scale, 0.12 * scale, 3);
    noseGeo.rotateX(Math.PI);
    const noseMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.42 * scale, 1.25 * scale);
    group.add(nose);

    // Pointed Cat Ears (Left & Right)
    const earGeo = new THREE.ConeGeometry(0.28 * scale, 0.65 * scale, 4);
    earGeo.rotateY(Math.PI / 4);
    const earMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.5,
    });
    const earInnerMat = new THREE.MeshBasicMaterial({ color: 0xfda4af });

    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.5 * scale, 1.1 * scale, 0.1 * scale);
    earL.rotation.z = 0.25;
    earL.rotation.x = -0.15;
    group.add(earL);

    const earR = new THREE.Mesh(earGeo, earMat);
    earR.position.set(0.5 * scale, 1.1 * scale, 0.1 * scale);
    earR.rotation.z = -0.25;
    earR.rotation.x = -0.15;
    group.add(earR);

    // Cute large round eyes
    const eyeGeo = new THREE.SphereGeometry(0.22 * scale, 14, 14);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
    });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.38 * scale, 0.65 * scale, 0.8 * scale);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.38 * scale, 0.65 * scale, 0.8 * scale);
    group.add(eyeR);

    // Sparkling eye glints
    const glintGeo = new THREE.SphereGeometry(0.06 * scale, 8, 8);
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const glintL = new THREE.Mesh(glintGeo, glintMat);
    glintL.position.set(-0.35 * scale, 0.72 * scale, 0.98 * scale);
    group.add(glintL);

    const glintR = new THREE.Mesh(glintGeo, glintMat);
    glintR.position.set(0.35 * scale, 0.72 * scale, 0.98 * scale);
    group.add(glintR);

    // Whiskers (thin horizontal rods)
    const whiskerGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.65 * scale, 4);
    whiskerGeo.rotateZ(Math.PI / 2);
    const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const wL1 = new THREE.Mesh(whiskerGeo, whiskerMat);
    wL1.position.set(-0.65 * scale, 0.35 * scale, 0.9 * scale);
    wL1.rotation.y = 0.2;
    group.add(wL1);

    const wR1 = new THREE.Mesh(whiskerGeo, whiskerMat);
    wR1.position.set(0.65 * scale, 0.35 * scale, 0.9 * scale);
    wR1.rotation.y = -0.2;
    group.add(wR1);

    // Playful small pink tongue
    const tongueGeo = new THREE.BoxGeometry(0.12 * scale, 0.04 * scale, 0.35 * scale);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, 0.22 * scale, 1.2 * scale);
    group.add(tongue);
  }

  // ----------------------------------------------------
  // 2. MONSTERS & MYTHICS (DRAGON / BEHEMOTH)
  // ----------------------------------------------------
  else if (modelType === 'dragon') {
    // Predatory elongated dragon skull
    const skullGeo = new THREE.ConeGeometry(0.85 * scale, 2.3 * scale, 12);
    skullGeo.rotateX(Math.PI / 2);
    const skullMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.3,
      metalness: 0.5,
    });
    const skull = new THREE.Mesh(skullGeo, skullMat);
    skull.position.set(0, 0.55 * scale, 0.4 * scale);
    skull.castShadow = !isSoftwareGl;
    group.add(skull);

    // Barbed brow ridge plate
    const browGeo = new THREE.BoxGeometry(0.95 * scale, 0.35 * scale, 1.1 * scale);
    const browMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      roughness: 0.4,
      metalness: 0.7,
    });
    const brow = new THREE.Mesh(browGeo, browMat);
    brow.position.set(0, 0.85 * scale, 0.3 * scale);
    group.add(brow);

    // Primary Swept Dragon Horns (Curved Backwards)
    const hornGeo = new THREE.ConeGeometry(0.18 * scale, 1.3 * scale, 8);
    hornGeo.rotateX(-0.55);
    const hornMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      metalness: 0.8,
      roughness: 0.2,
      emissive: glowColor,
      emissiveIntensity: 0.3,
    });
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.45 * scale, 1.15 * scale, -0.3 * scale);
    hornL.rotation.z = -0.35;
    group.add(hornL);

    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornR.position.set(0.45 * scale, 1.15 * scale, -0.3 * scale);
    hornR.rotation.z = 0.35;
    group.add(hornR);

    // Secondary Cheek Spikes
    const cheekHornGeo = new THREE.ConeGeometry(0.12 * scale, 0.7 * scale, 6);
    cheekHornGeo.rotateZ(Math.PI / 2);
    const chL = new THREE.Mesh(cheekHornGeo, hornMat);
    chL.position.set(-0.65 * scale, 0.45 * scale, 0.2 * scale);
    chL.rotation.y = -0.3;
    group.add(chL);

    const chR = new THREE.Mesh(cheekHornGeo, hornMat);
    chR.position.set(0.65 * scale, 0.45 * scale, 0.2 * scale);
    chR.rotation.y = 0.3;
    group.add(chR);

    // Fiery slit glowing eyes
    const eyeGeo = new THREE.BoxGeometry(0.28 * scale, 0.12 * scale, 0.12 * scale);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 1.2,
    });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.45 * scale, 0.75 * scale, 0.6 * scale);
    eyeL.rotation.y = 0.25;
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.45 * scale, 0.75 * scale, 0.6 * scale);
    eyeR.rotation.y = -0.25;
    group.add(eyeR);

    // Dragon Forked Tongue
    const tongueGeo = new THREE.BoxGeometry(0.14 * scale, 0.04 * scale, 0.8 * scale);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, 0.35 * scale, 1.7 * scale);
    group.add(tongue);
  }

  // ----------------------------------------------------
  // 3. SCI-FI / CYBERPUNK (ROBOT / MECH)
  // ----------------------------------------------------
  else if (modelType === 'robot') {
    // Angular beveled chassis
    const chassisGeo = new THREE.BoxGeometry(1.0 * scale, 0.75 * scale, 1.5 * scale);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      metalness: 0.85,
      roughness: 0.2,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.set(0, 0.55 * scale, 0.2 * scale);
    chassis.castShadow = !isSoftwareGl;
    group.add(chassis);

    // Heavy reinforced frontal armor
    const noseArmorGeo = new THREE.ConeGeometry(0.55 * scale, 0.7 * scale, 4);
    noseArmorGeo.rotateX(Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      metalness: 0.9,
      roughness: 0.3,
    });
    const noseArmor = new THREE.Mesh(noseArmorGeo, noseMat);
    noseArmor.position.set(0, 0.5 * scale, 1.2 * scale);
    group.add(noseArmor);

    // Wide glowing neon visor optic bar
    const visorGeo = new THREE.BoxGeometry(0.85 * scale, 0.16 * scale, 0.12 * scale);
    const visorMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 1.5,
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.65 * scale, 0.95 * scale);
    group.add(visor);

    // Dual cyber antennae with glowing tips
    const antGeo = new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 0.75 * scale, 6);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
    const tipGeo = new THREE.SphereGeometry(0.08 * scale, 8, 8);
    const tipMat = new THREE.MeshBasicMaterial({ color: glowColor });

    const antL = new THREE.Mesh(antGeo, antMat);
    antL.position.set(-0.45 * scale, 1.1 * scale, -0.1 * scale);
    antL.rotation.z = -0.3;
    group.add(antL);
    const tL = new THREE.Mesh(tipGeo, tipMat);
    tL.position.set(-0.55 * scale, 1.45 * scale, -0.1 * scale);
    group.add(tL);

    const antR = new THREE.Mesh(antGeo, antMat);
    antR.position.set(0.45 * scale, 1.1 * scale, -0.1 * scale);
    antR.rotation.z = 0.3;
    group.add(antR);
    const tR = new THREE.Mesh(tipGeo, tipMat);
    tR.position.set(0.55 * scale, 1.45 * scale, -0.1 * scale);
    group.add(tR);

    // Laser tongue / plasma probe
    const probeGeo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.6 * scale, 8);
    probeGeo.rotateX(Math.PI / 2);
    const probeMat = new THREE.MeshBasicMaterial({ color: glowColor });
    tongue = new THREE.Mesh(probeGeo, probeMat);
    tongue.position.set(0, 0.4 * scale, 1.5 * scale);
    group.add(tongue);
  }

  // ----------------------------------------------------
  // 4. TASTY FOODS (MELON / DONUT / PIZZA)
  // ----------------------------------------------------
  else if (modelType === 'food') {
    // Round glossy melon/pastry head
    const headGeo = new THREE.SphereGeometry(0.85 * scale, 20, 20);
    const headMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.3,
      metalness: 0.1,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.55 * scale, 0.3 * scale);
    head.castShadow = !isSoftwareGl;
    group.add(head);

    // Topping glaze layer
    const glazeGeo = new THREE.SphereGeometry(0.88 * scale, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const glazeMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      roughness: 0.2,
      metalness: 0.1,
    });
    const glaze = new THREE.Mesh(glazeGeo, glazeMat);
    glaze.position.set(0, 0.55 * scale, 0.3 * scale);
    group.add(glaze);

    // Cherry stem & fruit on top
    const stemGeo = new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 0.45 * scale, 6);
    stemGeo.rotateZ(0.2);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0.08 * scale, 1.5 * scale, 0.3 * scale);
    group.add(stem);

    const cherryGeo = new THREE.SphereGeometry(0.22 * scale, 12, 12);
    const cherryMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2 });
    const cherry = new THREE.Mesh(cherryGeo, cherryMat);
    cherry.position.set(0, 1.35 * scale, 0.3 * scale);
    group.add(cherry);

    // Playful cartoon googly eyes
    const eyeGeo = new THREE.SphereGeometry(0.22 * scale, 14, 14);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupGeo = new THREE.SphereGeometry(0.11 * scale, 10, 10);
    const pupMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.35 * scale, 0.7 * scale, 0.9 * scale);
    group.add(eyeL);
    const pL = new THREE.Mesh(pupGeo, pupMat);
    pL.position.set(-0.35 * scale, 0.7 * scale, 1.08 * scale);
    group.add(pL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.35 * scale, 0.7 * scale, 0.9 * scale);
    group.add(eyeR);
    const pR = new THREE.Mesh(pupGeo, pupMat);
    pR.position.set(0.35 * scale, 0.7 * scale, 1.08 * scale);
    group.add(pR);

    // Sweet pink lollipop tongue
    const tongueGeo = new THREE.BoxGeometry(0.14 * scale, 0.04 * scale, 0.5 * scale);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, 0.3 * scale, 1.25 * scale);
    group.add(tongue);
  }

  // ----------------------------------------------------
  // 5. CELESTIAL & VOID (ROYAL CROWN / HALO)
  // ----------------------------------------------------
  else if (modelType === 'celestial') {
    // Faceted cosmic skull
    const skullGeo = new THREE.IcosahedronGeometry(0.85 * scale, 1);
    const skullMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.15,
      metalness: 0.9,
    });
    const skull = new THREE.Mesh(skullGeo, skullMat);
    skull.position.set(0, 0.6 * scale, 0.3 * scale);
    skull.castShadow = !isSoftwareGl;
    group.add(skull);

    // Floating Imperial Golden Crown / Halo
    const crownGeo = new THREE.TorusGeometry(0.6 * scale, 0.08 * scale, 6, 24);
    crownGeo.rotateX(Math.PI / 2);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
      metalness: 0.95,
      roughness: 0.1,
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(0, 1.35 * scale, 0.25 * scale);
    group.add(crown);

    // Crown jewel peaks
    for (let p = 0; p < 4; p++) {
      const peakAngle = (p / 4) * Math.PI * 2;
      const peakGeo = new THREE.ConeGeometry(0.08 * scale, 0.3 * scale, 4);
      const peak = new THREE.Mesh(peakGeo, crownMat);
      peak.position.set(
        Math.cos(peakAngle) * 0.6 * scale,
        1.5 * scale,
        0.25 * scale + Math.sin(peakAngle) * 0.6 * scale
      );
      group.add(peak);
    }

    // Star-burst gem eyes
    const eyeGeo = new THREE.OctahedronGeometry(0.18 * scale, 0);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 1.5,
    });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.45 * scale, 0.7 * scale, 0.7 * scale);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.45 * scale, 0.7 * scale, 0.7 * scale);
    group.add(eyeR);

    // Golden divine tongue
    const tongueGeo = new THREE.BoxGeometry(0.12 * scale, 0.04 * scale, 0.6 * scale);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, 0.35 * scale, 1.35 * scale);
    group.add(tongue);
  }

  // ----------------------------------------------------
  // 6. CLASSIC SERPENT
  // ----------------------------------------------------
  else {
    const skullGeo = new THREE.ConeGeometry(0.85 * scale, 1.8 * scale, 16);
    skullGeo.rotateX(Math.PI / 2);
    const skullMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.25,
      metalness: 0.4,
    });
    const skull = new THREE.Mesh(skullGeo, skullMat);
    skull.position.set(0, 0.5 * scale, 0.3 * scale);
    skull.castShadow = !isSoftwareGl;
    group.add(skull);

    const browGeo = new THREE.BoxGeometry(0.9 * scale, 0.3 * scale, 0.8 * scale);
    const browMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      roughness: 0.4,
      metalness: 0.6,
    });
    const brow = new THREE.Mesh(browGeo, browMat);
    brow.position.set(0, 0.75 * scale, 0.2 * scale);
    group.add(brow);

    const eyeGeo = new THREE.SphereGeometry(0.18 * scale, 12, 12);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 1.0,
      roughness: 0.1,
    });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.45 * scale, 0.7 * scale, 0.4 * scale);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.45 * scale, 0.7 * scale, 0.4 * scale);
    group.add(eyeR);

    const hornGeo = new THREE.ConeGeometry(0.15 * scale, 0.7 * scale, 8);
    hornGeo.rotateX(-0.3);
    const hornMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      metalness: 0.8,
      roughness: 0.2,
    });
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.35 * scale, 0.95 * scale, -0.2 * scale);
    hornL.rotation.z = -0.2;
    group.add(hornL);

    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornR.position.set(0.35 * scale, 0.95 * scale, -0.2 * scale);
    hornR.rotation.z = 0.2;
    group.add(hornR);

    const tongueGeo = new THREE.BoxGeometry(0.12 * scale, 0.04 * scale, 0.6 * scale);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, 0.35 * scale, 1.4 * scale);
    group.add(tongue);
  }

  return { headGroup: group, tongueMesh: tongue };
}

export function buildSnakeSegmentMesh(
  primaryColor: string,
  secondaryColor: string,
  glowColor: string,
  index: number,
  modelType: SkinModelType = 'classic',
  isSoftwareGl: boolean = false,
  scale: number = 1.0
): THREE.Mesh {
  const isAlt = index % 2 === 0;
  let geo: THREE.BufferGeometry;

  if (modelType === 'cat') {
    // Soft rounded sphere beads
    geo = new THREE.SphereGeometry(0.55 * scale, 14, 14);
  } else if (modelType === 'dragon') {
    // Spiked armored dodecahedron
    geo = new THREE.DodecahedronGeometry(0.56 * scale, 1);
  } else if (modelType === 'robot') {
    // Hexagonal cyber prism
    geo = new THREE.CylinderGeometry(0.52 * scale, 0.52 * scale, 0.65 * scale, 6);
  } else if (modelType === 'food') {
    // Torus / rounded melon rind
    geo = new THREE.TorusGeometry(0.38 * scale, 0.2 * scale, 10, 16);
  } else if (modelType === 'celestial') {
    // Faceted crystal gem
    geo = new THREE.OctahedronGeometry(0.58 * scale, 0);
  } else {
    // Classic dodecahedron
    geo = new THREE.DodecahedronGeometry(0.55 * scale, 1);
  }

  const mat = new THREE.MeshStandardMaterial({
    color: isAlt ? primaryColor : secondaryColor,
    roughness: modelType === 'cat' ? 0.7 : 0.35,
    metalness: modelType === 'robot' || modelType === 'celestial' ? 0.85 : 0.3,
    emissive: isAlt ? glowColor : 0x000000,
    emissiveIntensity: isAlt ? 0.25 : 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = !isSoftwareGl;
  mesh.receiveShadow = !isSoftwareGl;
  return mesh;
}
