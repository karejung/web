#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define the directories to process
const directories = [
  'public/gltf/1'
];

// Process each directory
directories.forEach(dir => {
  const files = fs.readdirSync(dir);
  
  // Process each GLTF/GLB file
  files.forEach(file => {
    if ((file.endsWith('.gltf') || file.endsWith('.glb')) && !file.includes('draco') && file !== 'test.gltf') {
      const inputPath = path.join(dir, file);
      const ext = path.extname(file);
      const baseName = path.basename(file, ext);
      const outputFileName = `${baseName}_draco${ext}`;
      const outputPath = path.join(dir, outputFileName);
      
      console.log(`Compressing ${inputPath}...`);
      
      try {
        // Use gltf-transform to apply Draco compression
        // Using maximum quantization bits to preserve geometry details
        execSync(
          `npx gltf-transform draco "${inputPath}" "${outputPath}" ` +
          `--method edgebreaker ` +
          `--quantize-position 14 ` +
          `--quantize-normal 10 ` +
          `--quantize-texcoord 12 ` +
          `--encode-speed 0`,
          {
            stdio: 'inherit'
          }
        );
        
        console.log(`Successfully compressed to ${outputPath}`);
        
        // Display file size comparison
        const originalSize = fs.statSync(inputPath).size;
        const compressedSize = fs.statSync(outputPath).size;
        const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(2);
        console.log(`Original: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log(`Compressed: ${(compressedSize / 1024).toFixed(2)} KB`);
        console.log(`Reduction: ${reduction}%\n`);
      } catch (error) {
        console.error(`Error compressing ${inputPath}:`, error.message);
      }
    }
  });
});

console.log('Draco compression completed for all models.');

