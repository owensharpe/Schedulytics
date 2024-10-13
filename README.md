# f24-group14

## Overview

This project contains a web application stored in the `website` directory. After cloning the repository, follow the steps below to install dependencies and download large files managed by Git LFS.

## Setup Instructions

### 1. Clone the Repository

First, clone the repository using Git:

```bash
git clone https://github.com/yourusername/your-repo.git
```

### 2. Navigate to the Website Directory

After cloning, move into the `website` directory:

```bash
cd website
```

### 3. Install Dependencies

Use `npm` to install all necessary dependencies for the project:

```bash
npm install
```

### 4. Git LFS Setup (if required)

If you haven't installed Git LFS on your machine yet, do so now (can be ran in VSCode):

- **macOS**: `brew install git-lfs`
- **Ubuntu/Debian**: `sudo apt-get install git-lfs`
- **Windows**: `git lfs install`

Then, run the following command to set up Git LFS:

```bash
git lfs install
```

### 5. Pull LFS-Tracked Files

Run the following command to pull large files (such as `.mp4` files) tracked by Git LFS:

```bash
git lfs pull
```

### 6. Run the Application

Once the dependencies and large files are set up, you can start the application as per your project's setup (e.g., using `npm run dev` or other relevant commands).
