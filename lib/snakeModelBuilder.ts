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

    // Muzzle / Snout (Puffy cheeks) - Part of the jaw
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, 0.35 * scale, 0.2 * scale);

    const snoutGeo = new THREE.SphereGeometry(0.35 * scale, 12, 12);
    snoutGeo.scale(1.4, 0.8, 1.0);
    const snoutMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      roughness: 0.5,
    });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, 0, 0.7 * scale);
    jawGroup.add(snout);
    group.add(jawGroup);

    // Small pink nose tip
    const noseGeo = new THREE.ConeGeometry(0.1 * scale, 0.12 * scale, 3);
    noseGeo.rotateX(Math.PI);
    const noseMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.07 * scale, 1.05 * scale);
    jawGroup.add(nose);

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

    // Teeth for cat
    const toothGeo = new THREE.ConeGeometry(0.04 * scale, 0.15 * scale, 4);
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tL = new THREE.Mesh(toothGeo, toothMat);
    tL.position.set(-0.15 * scale, 0.05 * scale, 0.9 * scale);
    jawGroup.add(tL);
    const tR = new THREE.Mesh(toothGeo, toothMat);
    tR.position.set(0.15 * scale, 0.05 * scale, 0.9 * scale);
    jawGroup.add(tR);

    // Playful small pink tongue
    const tongueGeo = new THREE.BoxGeometry(0.12 * scale, 0.04 * scale, 0.35 * scale);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, -0.13 * scale, 1.0 * scale);
    jawGroup.add(tongue);
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

    // Lower jaw group for dragon
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, 0.25 * scale, 0.4 * scale);

    // Dragon Fangs
    const toothGeo = new THREE.ConeGeometry(0.08 * scale, 0.35 * scale, 4);
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -1; i <= 1; i += 2) {
      const fang = new THREE.Mesh(toothGeo, toothMat);
      fang.position.set(i * 0.3 * scale, 0.15 * scale, 1.2 * scale);
      fang.rotation.x = -0.2;
      jawGroup.add(fang);
    }

    // Dragon Forked Tongue
    const tongueGeo = new THREE.BoxGeometry(0.14 * scale, 0.04 * scale, 0.8 * scale);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, 0.1 * scale, 1.3 * scale);
    jawGroup.add(tongue);

    group.add(jawGroup);
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

    // Cyber jaw
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, 0.3 * scale, 0.2 * scale);

    // Laser tongue / plasma probe
    const probeGeo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.6 * scale, 8);
    probeGeo.rotateX(Math.PI / 2);
    const probeMat = new THREE.MeshBasicMaterial({ color: glowColor });
    tongue = new THREE.Mesh(probeGeo, probeMat);
    tongue.position.set(0, 0.1 * scale, 1.3 * scale);
    jawGroup.add(tongue);

    // Mechanical "teeth" (metal bars)
    const toothGeo = new THREE.BoxGeometry(0.1 * scale, 0.1 * scale, 0.1 * scale);
    const toothMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(toothGeo, toothMat);
      bar.position.set(i * 0.15 * scale, 0.05 * scale, 1.1 * scale);
      jawGroup.add(bar);
    }

    group.add(jawGroup);
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

    // Food jaw
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, 0.25 * scale, 0.3 * scale);

    // Sweet pink lollipop tongue
    const tongueGeo = new THREE.BoxGeometry(0.14 * scale, 0.04 * scale, 0.5 * scale);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, 0.05 * scale, 0.95 * scale);
    jawGroup.add(tongue);

    // Cartoon teeth (white blocks)
    const toothGeo = new THREE.BoxGeometry(0.15 * scale, 0.15 * scale, 0.05 * scale);
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -1; i <= 1; i++) {
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(i * 0.2 * scale, 0.1 * scale, 0.85 * scale);
      jawGroup.add(tooth);
    }

    group.add(jawGroup);
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

    // Celestial jaw
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, 0.25 * scale, 0.3 * scale);

    // Golden divine tongue
    const tongueGeo = new THREE.BoxGeometry(0.12 * scale, 0.04 * scale, 0.6 * scale);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, 0.1 * scale, 1.05 * scale);
    jawGroup.add(tongue);

    group.add(jawGroup);
  }

  // ----------------------------------------------------
  // 6. CLASSIC SERPENT (MINECRAFT BLOCKY STYLE WITH JAW)
  // ----------------------------------------------------
  else if (modelType === 'classic') {
    // Upper head block
    const upperGeo = new THREE.BoxGeometry(1.0 * scale, 0.7 * scale, 1.2 * scale);
    const headMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.8,
      metalness: 0.1,
    });
    const upperHead = new THREE.Mesh(upperGeo, headMat);
    upperHead.position.set(0, 0.45 * scale, 0.3 * scale);
    upperHead.castShadow = !isSoftwareGl;
    group.add(upperHead);

    // Lower jaw group for mouth open/close animation
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, 0.15 * scale, 0.3 * scale);

    const lowerGeo = new THREE.BoxGeometry(0.96 * scale, 0.3 * scale, 1.15 * scale);
    const lowerMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      roughness: 0.8,
      metalness: 0.1,
    });
    const lowerJaw = new THREE.Mesh(lowerGeo, lowerMat);
    lowerJaw.position.set(0, -0.15 * scale, 0);
    jawGroup.add(lowerJaw);

    // Tongue on jaw
    const tongueGeo = new THREE.BoxGeometry(0.2 * scale, 0.05 * scale, 0.6 * scale);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, 0.02 * scale, 0.6 * scale);
    jawGroup.add(tongue);

    // Classic teeth
    const toothGeo = new THREE.BoxGeometry(0.12 * scale, 0.12 * scale, 0.1 * scale);
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -2; i <= 2; i++) {
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(i * 0.18 * scale, 0.05 * scale, 0.55 * scale);
      jawGroup.add(tooth);
    }

    group.add(jawGroup);

    // Blocky pixel eyes
    const eyeGeo = new THREE.BoxGeometry(0.25 * scale, 0.22 * scale, 0.15 * scale);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 0.9,
    });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.42 * scale, 0.65 * scale, 0.65 * scale);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.42 * scale, 0.65 * scale, 0.65 * scale);
    group.add(eyeR);
  }

  // ----------------------------------------------------
  // 7. ROLLER COASTER CAR
  // ----------------------------------------------------
  else if (modelType === 'roller_coaster') {
    // Rectangular car body
    const carGeo = new THREE.BoxGeometry(1.2 * scale, 0.8 * scale, 1.6 * scale);
    const carMat = new THREE.MeshStandardMaterial({ color: primaryColor, metalness: 0.7, roughness: 0.2 });
    const car = new THREE.Mesh(carGeo, carMat);
    car.position.set(0, 0.5 * scale, 0);
    group.add(car);

    // Front windshield / grill
    const windGeo = new THREE.PlaneGeometry(1.0 * scale, 0.4 * scale);
    const windMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
    const wind = new THREE.Mesh(windGeo, windMat);
    wind.position.set(0, 0.6 * scale, 0.81 * scale);
    group.add(wind);

    // Headlights
    const lightGeo = new THREE.CircleGeometry(0.15 * scale, 16);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lightL = new THREE.Mesh(lightGeo, lightMat);
    lightL.position.set(-0.4 * scale, 0.3 * scale, 0.81 * scale);
    group.add(lightL);
    const lightR = new THREE.Mesh(lightGeo, lightMat);
    lightR.position.set(0.4 * scale, 0.3 * scale, 0.81 * scale);
    group.add(lightR);

    // Jaw group for roller coaster (front bumper)
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, 0.2 * scale, 0.8 * scale);
    const bumperGeo = new THREE.BoxGeometry(1.3 * scale, 0.25 * scale, 0.3 * scale);
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(0, -0.1 * scale, 0.1 * scale);
    jawGroup.add(bumper);
    group.add(jawGroup);
  }

  // ----------------------------------------------------
  // 8. SNOWMAN
  // ----------------------------------------------------
  else if (modelType === 'snowman') {
    const headGeo = new THREE.SphereGeometry(0.7 * scale, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.7 * scale, 0);
    group.add(head);

    // Carrot nose
    const noseGeo = new THREE.ConeGeometry(0.12 * scale, 0.5 * scale, 8);
    noseGeo.rotateX(Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.7 * scale, 0.7 * scale);
    group.add(nose);

    // Coal eyes
    const coalGeo = new THREE.SphereGeometry(0.1 * scale, 8, 8);
    const coalMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeL = new THREE.Mesh(coalGeo, coalMat);
    eyeL.position.set(-0.25 * scale, 0.85 * scale, 0.55 * scale);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(coalGeo, coalMat);
    eyeR.position.set(0.25 * scale, 0.85 * scale, 0.55 * scale);
    group.add(eyeR);

    // Top hat
    const hatBaseGeo = new THREE.CylinderGeometry(0.6 * scale, 0.6 * scale, 0.1 * scale, 16);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
    const hatBase = new THREE.Mesh(hatBaseGeo, hatMat);
    hatBase.position.set(0, 1.3 * scale, 0);
    group.add(hatBase);
    const hatTopGeo = new THREE.CylinderGeometry(0.4 * scale, 0.4 * scale, 0.6 * scale, 16);
    const hatTop = new THREE.Mesh(hatTopGeo, hatMat);
    hatTop.position.set(0, 1.6 * scale, 0);
    group.add(hatTop);

    // Jaw (Bottom snowball segment)
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, 0.3 * scale, 0.3 * scale);
    const lowerGeo = new THREE.SphereGeometry(0.4 * scale, 12, 12);
    const lower = new THREE.Mesh(lowerGeo, headMat);
    lower.position.set(0, -0.2 * scale, 0.2 * scale);
    jawGroup.add(lower);
    group.add(jawGroup);
  }

  // ----------------------------------------------------
  // 9. YETI
  // ----------------------------------------------------
  else if (modelType === 'yeti') {
    const headGeo = new THREE.BoxGeometry(1.2 * scale, 1.2 * scale, 1.2 * scale);
    const furMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 1.0 });
    const head = new THREE.Mesh(headGeo, furMat);
    head.position.set(0, 0.6 * scale, 0);
    group.add(head);

    // Face patch
    const faceGeo = new THREE.PlaneGeometry(0.8 * scale, 0.6 * scale);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 0.7 * scale, 0.61 * scale);
    group.add(face);

    // Horns
    const hornGeo = new THREE.ConeGeometry(0.2 * scale, 0.6 * scale, 8);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const hL = new THREE.Mesh(hornGeo, hornMat);
    hL.position.set(-0.5 * scale, 1.2 * scale, 0);
    hL.rotation.z = 0.4;
    group.add(hL);
    const hR = new THREE.Mesh(hornGeo, hornMat);
    hR.position.set(0.5 * scale, 1.2 * scale, 0);
    hR.rotation.z = -0.4;
    group.add(hR);

    // Jaw
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, 0.2 * scale, 0.5 * scale);
    const lowerGeo = new THREE.BoxGeometry(1.0 * scale, 0.4 * scale, 0.6 * scale);
    const lower = new THREE.Mesh(lowerGeo, furMat);
    lower.position.set(0, -0.2 * scale, 0.1 * scale);
    jawGroup.add(lower);
    
    // Teeth
    const toothGeo = new THREE.BoxGeometry(0.1 * scale, 0.2 * scale, 0.1 * scale);
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -1; i <= 1; i++) {
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(i * 0.3 * scale, 0.1 * scale, 0.31 * scale);
      jawGroup.add(tooth);
    }
    group.add(jawGroup);
  }

  // ----------------------------------------------------
  // 10. ELECTRIC EEL
  // ----------------------------------------------------
  else if (modelType === 'electric_eel') {
    const headGeo = new THREE.CapsuleGeometry(0.5 * scale, 1.0 * scale, 4, 16);
    headGeo.rotateX(Math.PI / 2);
    const eelMat = new THREE.MeshStandardMaterial({ color: primaryColor, emissive: glowColor, emissiveIntensity: 0.5 });
    const head = new THREE.Mesh(headGeo, eelMat);
    head.position.set(0, 0.5 * scale, 0);
    group.add(head);

    // Glow streaks
    const glowGeo = new THREE.BoxGeometry(0.1 * scale, 0.05 * scale, 0.8 * scale);
    const glowMat = new THREE.MeshBasicMaterial({ color: glowColor });
    const gL = new THREE.Mesh(glowGeo, glowMat);
    gL.position.set(-0.45 * scale, 0.5 * scale, 0);
    group.add(gL);
    const gR = new THREE.Mesh(glowGeo, glowMat);
    gR.position.set(0.45 * scale, 0.5 * scale, 0);
    group.add(gR);

    // Jaw
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, 0.3 * scale, 0.5 * scale);
    const lowerGeo = new THREE.BoxGeometry(0.8 * scale, 0.3 * scale, 0.6 * scale);
    const lower = new THREE.Mesh(lowerGeo, eelMat);
    lower.position.set(0, -0.15 * scale, 0.1 * scale);
    jawGroup.add(lower);
    group.add(jawGroup);
  }

  // ----------------------------------------------------
  // 11. SHARK (Apex Ocean Predator)
  // ----------------------------------------------------
  else if (modelType === 'shark') {
    // Streamlined shark skull
    const skullGeo = new THREE.ConeGeometry(0.7 * scale, 1.4 * scale, 8);
    skullGeo.rotateX(-Math.PI / 2);
    const sharkMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.3,
      metalness: 0.2,
    });
    const skull = new THREE.Mesh(skullGeo, sharkMat);
    skull.position.set(0, 0.45 * scale, 0.2 * scale);
    skull.castShadow = !isSoftwareGl;
    group.add(skull);

    // Iconic Dorsal Fin
    const finGeo = new THREE.ConeGeometry(0.25 * scale, 0.75 * scale, 4);
    finGeo.rotateZ(0.2);
    const finMat = new THREE.MeshStandardMaterial({ color: secondaryColor });
    const dorsalFin = new THREE.Mesh(finGeo, finMat);
    dorsalFin.position.set(0, 1.05 * scale, -0.15 * scale);
    group.add(dorsalFin);

    // Side pectoral fins
    const pecGeo = new THREE.BoxGeometry(0.55 * scale, 0.08 * scale, 0.35 * scale);
    const pecL = new THREE.Mesh(pecGeo, finMat);
    pecL.position.set(-0.7 * scale, 0.35 * scale, 0);
    pecL.rotation.z = -0.3;
    group.add(pecL);
    const pecR = new THREE.Mesh(pecGeo, finMat);
    pecR.position.set(0.7 * scale, 0.35 * scale, 0);
    pecR.rotation.z = 0.3;
    group.add(pecR);

    // Predator glowing eyes
    const eyeGeo = new THREE.SphereGeometry(0.12 * scale, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: glowColor });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.45 * scale, 0.55 * scale, 0.35 * scale);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.45 * scale, 0.55 * scale, 0.35 * scale);
    group.add(eyeR);

    // Snapping lower jaw with sharp razor teeth
    const jawGroup = new THREE.Group();
    jawGroup.name = 'jawGroup';
    jawGroup.position.set(0, 0.25 * scale, 0.25 * scale);
    const lowerGeo = new THREE.BoxGeometry(0.65 * scale, 0.2 * scale, 0.75 * scale);
    const lowerMat = new THREE.MeshStandardMaterial({ color: secondaryColor });
    const lower = new THREE.Mesh(lowerGeo, lowerMat);
    lower.position.set(0, -0.05 * scale, 0.2 * scale);
    jawGroup.add(lower);

    // Razor white teeth row
    const toothGeo = new THREE.ConeGeometry(0.06 * scale, 0.16 * scale, 3);
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -2; i <= 2; i++) {
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set(i * 0.12 * scale, 0.08 * scale, 0.45 * scale);
      jawGroup.add(tooth);
    }
    group.add(jawGroup);
  }
  else {
    const fallbackGeo = new THREE.SphereGeometry(0.8 * scale, 16, 16);
    const fallbackMat = new THREE.MeshStandardMaterial({ color: primaryColor });
    const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
    group.add(fallbackMesh);
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
  // Minecraft block geometry for snake body segments
  const geo = new THREE.BoxGeometry(0.9 * scale, 0.9 * scale, 0.9 * scale);

  const mat = new THREE.MeshStandardMaterial({
    color: isAlt ? primaryColor : secondaryColor,
    roughness: 0.8,
    metalness: 0.1,
    emissive: isAlt ? glowColor : 0x000000,
    emissiveIntensity: isAlt ? 0.3 : 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = !isSoftwareGl;
  mesh.receiveShadow = !isSoftwareGl;
  return mesh;
}
