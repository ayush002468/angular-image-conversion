import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Declare JSZip on window for TypeScript
declare global {
  interface Window {
    JSZip: any;
  }
}

interface ImageFile {
  name: string;
  path: string;
  file: File;
  url: string;
  isFolder?: boolean;
  children?: ImageFile[];
  parent?: ImageFile;
  expanded?: boolean;
  matched?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: false,
  template: `
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Image Folder Replacement Tool</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <!-- Colored Images Section -->
        <div class="border rounded p-4">
          <h2 class="text-xl font-semibold mb-2">
            Source Folder (Colored Images)
          </h2>
          <input
            type="file"
            webkitdirectory
            directory
            multiple
            (change)="onColoredFolderSelected($event)"
            class="block w-full text-sm mb-4"
          />
          <div *ngIf="coloredImages.length > 0" class="mt-2">
            <p class="text-gray-700">
              {{ coloredImages.length }} colored images found
            </p>
          </div>
        </div>

        <!-- Black & White Images Section -->
        <div class="border rounded p-4">
          <h2 class="text-xl font-semibold mb-2">
            Target Folder (Black & White Images)
          </h2>
          <input
            type="file"
            webkitdirectory
            directory
            multiple
            (change)="onBWFolderSelected($event)"
            class="block w-full text-sm mb-4"
          />
          <div *ngIf="bwImages.length > 0" class="mt-2">
            <p class="text-gray-700">
              {{ bwImages.length }} black & white images found
            </p>
          </div>
        </div>
      </div>

      <div
        class="flex justify-center mb-6"
        *ngIf="coloredImages.length > 0 && bwImages.length > 0"
      >
        <button
          (click)="processReplacement()"
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Find & Replace Images
        </button>
      </div>

      <!-- Results Section -->
      <div *ngIf="matchedImages.length > 0" class="border rounded p-4 mb-6">
        <h2 class="text-xl font-semibold mb-4">
          Matched Images ({{ matchedImages.length }})
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let match of matchedImages" class="border rounded p-2">
            <div class="grid grid-cols-2 gap-2">
              <div class="text-center">
                <p class="text-xs font-semibold mb-1">Original (B&W)</p>
                <img
                  [src]="match.bwImage.url"
                  class="h-32 mx-auto object-contain"
                  [alt]="match.bwImage.name"
                />
              </div>
              <div class="text-center">
                <p class="text-xs font-semibold mb-1">Replacement (Color)</p>
                <img
                  [src]="match.coloredImage.url"
                  class="h-32 mx-auto object-contain"
                  [alt]="match.coloredImage.name"
                />
              </div>
            </div>
            <p class="text-xs mt-2 truncate">{{ match.bwImage.path }}</p>
          </div>
        </div>
      </div>

      <!-- Download Section -->
      <div *ngIf="matchedImages.length > 0" class="border rounded p-4 mb-6">
        <h2 class="text-xl font-semibold mb-4">Download Modified Structure</h2>
        <p class="mb-4">
          Ready to download a zip file containing your folder structure with
          replaced images.
        </p>
        <button
          (click)="generateAndDownloadZip()"
          class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Download ZIP with Replaced Images
        </button>
      </div>

      <!-- Folder Structure Preview -->
      <div *ngIf="bwRootFolders.length > 0" class="border rounded p-4">
        <h2 class="text-xl font-semibold mb-4">Target Folder Structure</h2>
        <div class="folder-structure">
          <ng-container *ngFor="let folder of bwRootFolders">
            <div class="folder-item">
              <span class="cursor-pointer" (click)="toggleFolder(folder)">
                {{ folder.isFolder ? (folder.expanded ? '▼ ' : '► ') : '' }}
                {{ folder.name }} {{ folder.isFolder ? '(folder)' : '' }}
              </span>
              <div
                *ngIf="folder.isFolder && folder.expanded"
                class="pl-4 border-l ml-2 mt-1"
              >
                <ng-container
                  *ngTemplateOutlet="
                    folderTreeTemplate;
                    context: { $implicit: folder.children }
                  "
                ></ng-container>
              </div>
            </div>
          </ng-container>
        </div>
      </div>
    </div>

    <!-- Folder Tree Template -->
    <ng-template #folderTreeTemplate let-items>
      <ng-container *ngFor="let item of items">
        <div class="folder-item">
          <span
            class="cursor-pointer"
            [class.text-green-600]="item.matched"
            (click)="toggleFolder(item)"
          >
            {{ item.isFolder ? (item.expanded ? '▼ ' : '► ') : '' }}
            {{ item.name }} {{ item.isFolder ? '(folder)' : '' }}
            <span *ngIf="item.matched" class="text-green-600 text-xs"
              >(matched)</span
            >
          </span>
          <div
            *ngIf="item.isFolder && item.expanded"
            class="pl-4 border-l ml-2 mt-1"
          >
            <ng-container
              *ngTemplateOutlet="
                folderTreeTemplate;
                context: { $implicit: item.children }
              "
            ></ng-container>
          </div>
        </div>
      </ng-container>
    </ng-template>
  `,
  styles: [
    `
      .folder-item {
        margin: 4px 0;
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  coloredImages: ImageFile[] = [];
  bwImages: ImageFile[] = [];
  bwRootFolders: ImageFile[] = [];
  matchedImages: { coloredImage: ImageFile; bwImage: ImageFile }[] = [];

  ngOnInit() {
    // Load JSZip from CDN if not already loaded
    if (!window.JSZip) {
      const script = document.createElement('script');
      script.src =
        'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }

  onColoredFolderSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.processFiles(input.files, true);
    // Reset matches when new files are loaded
    this.matchedImages = [];
  }

  onBWFolderSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.processFiles(input.files, false);
    // Reset matches when new files are loaded
    this.matchedImages = [];
  }

  processFiles(files: FileList | null, isColored: boolean): void {
    if (!files) return;

    const images: ImageFile[] = [];
    const folders: Record<string, ImageFile> = {};
    const rootFolders: ImageFile[] = [];

    // First pass: Create file objects and folder structure
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Skip non-image files
      if (!file.type.startsWith('image/')) continue;

      const pathParts = file.webkitRelativePath.split('/');
      const fileName = pathParts[pathParts.length - 1];

      // Create the image file object
      const imageFile: ImageFile = {
        name: fileName,
        path: file.webkitRelativePath,
        file: file,
        url: URL.createObjectURL(file),
        isFolder: false,
        matched: false,
      };

      images.push(imageFile);

      // Process folder structure (for all images)
      if (pathParts.length > 2) {
        let currentPath = '';
        let parentFolder: ImageFile | undefined = undefined;

        // Process each folder in the path
        for (let j = 0; j < pathParts.length - 1; j++) {
          const folderName = pathParts[j];

          if (j === 0) {
            currentPath = folderName;
          } else {
            currentPath = `${currentPath}/${folderName}`;
          }

          // Skip the root upload folder
          if (j === 0) continue;

          // Create folder if it doesn't exist
          if (!folders[currentPath]) {
            const folder: ImageFile = {
              name: folderName,
              path: currentPath,
              file: file, // Just a reference for context
              url: '',
              isFolder: true,
              children: [],
              expanded: false,
              matched: false,
            };

            folders[currentPath] = folder;

            // Set parent-child relationship
            if (parentFolder) {
              folder.parent = parentFolder;
              parentFolder.children?.push(folder);
            } else {
              // This is a root folder
              rootFolders.push(folder);
            }
          }

          parentFolder = folders[currentPath];
        }

        // Add the file to its parent folder
        if (parentFolder) {
          parentFolder.children?.push(imageFile);
          imageFile.parent = parentFolder;
        }
      }
    }

    if (isColored) {
      this.coloredImages = images;
    } else {
      this.bwImages = images;
      this.bwRootFolders = rootFolders;
    }
  }

  toggleFolder(folder: ImageFile): void {
    if (folder.isFolder) {
      folder.expanded = !folder.expanded;
    }
  }

  processReplacement(): void {
    this.matchedImages = [];

    // Create a map of colored images by filename for quick lookup
    const coloredImagesMap = new Map<string, ImageFile>();
    this.coloredImages.forEach((img) => {
      coloredImagesMap.set(img.name, img);
    });

    // Find matches in black and white images
    this.bwImages.forEach((bwImg) => {
      const coloredImage = coloredImagesMap.get(bwImg.name);
      if (coloredImage) {
        this.matchedImages.push({
          coloredImage,
          bwImage: bwImg,
        });

        // Mark as matched
        bwImg.matched = true;

        // Mark parent folders as having matches
        let parent = bwImg.parent;
        while (parent) {
          parent.matched = true;
          parent = parent.parent;
        }
      }
    });

    // Expand folders with matches
    this.expandMatchedFolders(this.bwRootFolders);

    // Show results
    console.log(`Found ${this.matchedImages.length} matching images`);
  }

  expandMatchedFolders(folders: ImageFile[] | undefined): void {
    if (!folders) return;

    folders.forEach((folder) => {
      if (folder.isFolder && folder.matched) {
        folder.expanded = true;
        this.expandMatchedFolders(folder.children);
      }
    });
  }

  async generateAndDownloadZip(): Promise<void> {
    // Ensure JSZip is loaded
    if (!window.JSZip) {
      alert('JSZip is still loading. Please try again in a moment.');
      return;
    }

    // Create new JSZip instance
    const zip = new window.JSZip();

    // Create a map of colored images by filename for quick lookup
    const coloredImagesMap = new Map<string, ImageFile>();
    this.coloredImages.forEach((img) => {
      coloredImagesMap.set(img.name, img);
    });

    // Add all BW images to zip, replacing with colored when match found
    for (const bwImg of this.bwImages) {
      const coloredImg = coloredImagesMap.get(bwImg.name);

      // Get path without the root folder name
      const pathParts = bwImg.path.split('/');
      pathParts.shift(); // Remove the root folder name
      const relativePath = pathParts.join('/');

      if (coloredImg && bwImg.matched) {
        // Use the colored image file instead
        zip.file(relativePath, coloredImg.file);
      } else {
        // Keep the original BW image
        zip.file(relativePath, bwImg.file);
      }
    }

    // Generate the zip file
    const content = await zip.generateAsync({ type: 'blob' });

    // Create download link
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'replaced_images.zip';
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
}
