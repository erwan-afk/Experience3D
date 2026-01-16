import { useMemo } from "react";
import { Text, Center } from "@react-three/drei";
import * as THREE from "three";

interface TextScreenProps {
  text: string;
  position?: [number, number, number];
  width?: number;
  height?: number;
}

/**
 * Affiche du texte sur un écran noir
 */
export function TextScreen({
  text,
  position = [0, 2.5, -9],
  width = 8,
  height = 4,
}: TextScreenProps) {
  return (
    <group position={position}>
      {/* Fond noir */}
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Texte centré */}
      <Center position={[0, 0, 0.01]}>
        <Text
          fontSize={1.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font="/fonts/Satoshi-Variable.woff2"
        >
          {text}
        </Text>
      </Center>
    </group>
  );
}
