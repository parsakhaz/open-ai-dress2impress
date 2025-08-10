# Contributing to Dress to Impress

First off, thank you for considering contributing to Dress to Impress! It's people like you that make this project such a great tool. 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment as described in the README
4. Create a new branch for your feature or fix
5. Make your changes
6. Push to your fork and submit a pull request

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots if applicable
- Your environment details (OS, browser, Node version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- A clear and descriptive title
- A detailed description of the proposed functionality
- Why this enhancement would be useful
- Possible implementation approach

### Code Contributions

#### First Time Contributors

Look for issues labeled `good first issue` or `help wanted`. These are great starting points for new contributors.

#### Areas of Contribution

- **UI/UX Improvements**: Enhance the game interface and user experience
- **AI Features**: Improve AI player logic or add new AI capabilities
- **Performance**: Optimize loading times and runtime performance
- **Documentation**: Improve README, add tutorials, or document code
- **Testing**: Add unit tests, integration tests, or E2E tests
- **Bug Fixes**: Fix reported issues
- **New Features**: Add new game modes, themes, or functionality

## Development Process

### Setting Up Your Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/open-ai-dress2impress.git
cd open-ai-dress2impress

# Add upstream remote
git remote add upstream https://github.com/originalowner/open-ai-dress2impress.git

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Add your API keys to .env.local

# Start development server
npm run dev
```

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/add-color-picker`)
- `fix/` - Bug fixes (e.g., `fix/timer-overflow`)
- `docs/` - Documentation updates (e.g., `docs/api-endpoints`)
- `refactor/` - Code refactoring (e.g., `refactor/state-management`)
- `test/` - Test additions or fixes (e.g., `test/avatar-generation`)

### Testing Your Changes

Before submitting a PR, ensure:

1. Your code runs without errors: `npm run dev`
2. TypeScript compilation succeeds: `npm run build`
3. Linting passes: `npm run lint`
4. All existing features still work
5. Your new feature/fix works as expected

## Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Avoid `any` types - be explicit with types
- Use functional components and hooks for React

### CSS/Styling

- Use Tailwind CSS classes when possible
- Follow the existing design system
- Maintain responsive design
- Test on different screen sizes
- Keep accessibility in mind (ARIA labels, keyboard navigation)

### File Organization

- Keep components small and focused
- Co-locate related files
- Use barrel exports for cleaner imports
- Follow the existing folder structure

## Commit Guidelines

We follow conventional commits specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

### Examples

```
feat(shopping): add filter by price range

fix(avatar): resolve webcam permission error on Safari

docs(api): add endpoint documentation for try-on service
```

### Commit Best Practices

- Keep commits atomic (one feature/fix per commit)
- Write clear, concise commit messages
- Reference issue numbers when applicable
- Avoid committing commented-out code
- Run linter before committing

## Pull Request Process

1. **Update your fork**
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, documented code
   - Add tests if applicable
   - Update documentation if needed

4. **Commit your changes**
   - Follow commit guidelines above
   - Keep commits focused and atomic

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes you made and why
   - Include screenshots for UI changes
   - Check all the boxes in the PR template

7. **Code Review**
   - Respond to feedback promptly
   - Make requested changes
   - Keep the discussion professional and focused

### PR Checklist

Before submitting, ensure:

- [ ] Code follows project style guidelines
- [ ] TypeScript compilation succeeds
- [ ] Linting passes without errors
- [ ] Changes are tested locally
- [ ] Documentation is updated if needed
- [ ] Commit messages follow guidelines
- [ ] PR description clearly explains changes

## Questions?

Feel free to open an issue for any questions about contributing. We're here to help!

Thank you for contributing to Dress to Impress! 🌟
