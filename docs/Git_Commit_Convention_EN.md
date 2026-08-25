# Git Commit Convention

## 📋 Table of Contents

1. [Overview](#overview)
2. [Commit Format](#commit-format)
3. [Commit Types](#commit-types)
4. [Message Writing Rules](#message-writing-rules)
5. [Valid Commit Examples](#valid-commit-examples)
6. [Invalid Commit Examples](#invalid-commit-examples)
7. [Implementation Guide](#implementation-guide)
8. [Pre-commit Checklist](#pre-commit-checklist)
9. [FAQ - Frequently Asked Questions](#faq---frequently-asked-questions)

---

## 🎯 Overview

### Purpose

- Ensure clear and traceable commit history
- Direct linking between code and Jira tickets
- Support automatic changelog and release notes generation
- Help team review code more efficiently

### Golden Principles

✅ **REQUIRED** Jira ticket reference  
✅ **REQUIRED** Use correct commit type  
✅ **REQUIRED** Write clear descriptive message  
✅ **RECOMMENDED** Write in English

---

## 📝 Commit Format

### Basic Structure

```
<type>(<jira>): <message>

[optional body]

[optional footer]
```

### Explanation of Each Part

| Part        | Required | Description                | Example                          |
| ----------- | -------- | -------------------------- | -------------------------------- |
| **type**    | ✅ Yes   | Type of change             | `feat`, `fix`, `refactor`        |
| **jira**    | ✅ Yes   | Jira ticket ID             | `HIFOS-123`, `MES-456`           |
| **message** | ✅ Yes   | Brief description (≤72 ch) | `add eSheet search feature`      |
| **body**    | ❌ No    | Detailed description       | Explain why, what, how           |
| **footer**  | ❌ No    | Additional metadata        | `Breaking Change`, `Closes #123` |

### Format Rules

```
✅ CORRECT: feat(HIFOS-123): add user authentication
✅ CORRECT: fix(MES-456): resolve null pointer in eSheet grid
✅ CORRECT: refactor(HIFOS-789): optimize database queries

❌ WRONG: feat: add user authentication          (missing Jira)
❌ WRONG: HIFOS-123: add user authentication     (missing type)
❌ WRONG: feat(HIFOS-123) add authentication     (missing colon)
❌ WRONG: Feat(HIFOS-123): add authentication    (uppercase type)
```

---

## 🏷️ Commit Types

### 1. `feat` - New Feature

**When to use:**

- Add new feature for users
- Add new API endpoint
- Add new component/screen

**Examples:**

```bash
feat(HIFOS-101): add eSheet search functionality
feat(HIFOS-102): implement Move-In validation logic
feat(HIFOS-103): create Lot Status dashboard
```

---

### 2. `fix` - Bug Fix

**When to use:**

- Fix production bugs
- Fix business logic errors
- Fix UI/UX issues

**Examples:**

```bash
fix(HIFOS-201): resolve null pointer exception in grid rendering
fix(HIFOS-202): correct Recipe validation in Move-In screen
fix(HIFOS-203): fix incorrect color display for HOLD status
```

---

### 3. `refactor` - Code Restructuring

**When to use:**

- Improve code structure without changing functionality
- Optimize performance
- Remove code duplication

**Examples:**

```bash
refactor(HIFOS-301): optimize eSheet grid rendering performance
refactor(HIFOS-302): extract common validation logic to utility
refactor(HIFOS-303): simplify Drawer Menu enable/disable logic
```

---

### 4. `test` - Add/Update Tests

**When to use:**

- Add new unit tests
- Add integration tests
- Update existing test cases

**Examples:**

```bash
test(HIFOS-401): add unit tests for Lot validation
test(HIFOS-402): add integration tests for Move-In API
test(HIFOS-403): update test cases for Recipe change logic
```

---

### 5. `docs` - Update Documentation

**When to use:**

- Add/update README
- Update API documentation
- Add code comments
- Create technical specification

**Examples:**

```bash
docs(HIFOS-501): add eSheet migration guide
docs(HIFOS-502): update API documentation for Move-In endpoint
docs(HIFOS-503): create Git commit convention document
```

---

### 6. `style` - Code Formatting

**When to use:**

- Format code (prettier, eslint)
- Fix indentation, spacing
- No logic changes

**Examples:**

```bash
style(HIFOS-601): format code with prettier
style(HIFOS-602): fix eslint warnings in eSheet component
style(HIFOS-603): update import order according to style guide
```

---

### 7. `chore` - Maintenance Work

**When to use:**

- Update dependencies
- Change build configuration
- Update CI/CD pipeline

**Examples:**

```bash
chore(HIFOS-701): upgrade Vue to version 3.4
chore(HIFOS-702): update webpack configuration
chore(HIFOS-703): add pre-commit hooks for linting
```

---

### 8. `perf` - Performance Improvement

**When to use:**

- Optimize processing speed
- Reduce memory usage
- Improve rendering performance

**Examples:**

```bash
perf(HIFOS-801): optimize Grid rendering with virtual scrolling
perf(HIFOS-802): reduce API response time by 50%
perf(HIFOS-803): implement lazy loading for eSheet data
```

---

### 9. `revert` - Revert Commit

**When to use:**

- Revert a previous commit
- Rollback changes causing errors

**Examples:**

```bash
revert(HIFOS-901): revert "feat(HIFOS-101): add eSheet search"

This reverts commit abc123def456.
Reason: Causing performance issues in production.
```

---

### 10. `release` - Release Version

**When to use:**

- Create new release version
- Update version number
- Create release tag

**Examples:**

```bash
release(HIFOS-1001): release version 1.0.0
release(HIFOS-1002): release version 2.1.0 with new features
release(HIFOS-1003): hotfix release version 1.0.1
```

---

## ✍️ Message Writing Rules

### 1. Message Length

```
✅ CORRECT: feat(HIFOS-123): add user authentication with JWT
✅ CORRECT: fix(HIFOS-456): resolve grid rendering issue

❌ WRONG: feat(HIFOS-123): add user authentication with JWT token and implement refresh token mechanism with Redis cache (too long, >72 characters)
```

**Rules:**

- Subject line (first line): **≤ 72 characters**
- Body (if present): each line **≤ 80 characters**

---

### 2. Grammar and Structure

```
✅ CORRECT: feat(HIFOS-123): add user login feature
✅ CORRECT: fix(HIFOS-456): resolve null pointer exception

❌ WRONG: feat(HIFOS-123): Added user login feature    (past tense)
❌ WRONG: feat(HIFOS-123): Add user login feature.     (period at end)
❌ WRONG: feat(HIFOS-123): Adding user login feature   (using -ing)
```

**Rules:**

- Use **imperative mood** (command): `add`, `fix`, `update`
- **DO NOT** use past tense: ~~`added`~~, ~~`fixed`~~
- **DO NOT** use -ing form: ~~`adding`~~, ~~`fixing`~~
- **NO** period at end of sentence
- Lowercase first letter (except proper nouns)

---

### 3. Message Content

```
✅ CORRECT: feat(HIFOS-123): add validation for Lot ID format
✅ CORRECT: fix(HIFOS-456): prevent duplicate Move-In requests

❌ WRONG: feat(HIFOS-123): update code           (too generic)
❌ WRONG: fix(HIFOS-456): fix bug                (unclear bug)
❌ WRONG: feat(HIFOS-123): WIP                   (no description)
```

**Rules:**

- Describe **SPECIFICALLY** what changed
- Focus on **WHAT** (what changed), not **HOW** (how it changed)
- Avoid generic words: ~~`update`~~, ~~`fix bug`~~, ~~`change`~~

---

### 4. Commit Body (Optional)

When detailed explanation is needed, add body after a blank line:

```bash
feat(HIFOS-123): add eSheet Grid with virtual scrolling

Implement virtual scrolling to improve performance when displaying
large datasets (>1000 rows). This reduces initial render time from
5s to 0.5s.

Technical details:
- Use IntersectionObserver API for viewport detection
- Render only visible rows + buffer (20 rows)
- Implement row height caching for smooth scrolling

Performance metrics:
- Initial render: 5s → 0.5s (90% improvement)
- Memory usage: 500MB → 50MB (90% reduction)
- Scroll FPS: 15 → 60 (4x improvement)
```

**When to add Body:**

- Complex changes needing explanation
- Breaking changes
- Performance improvements with metrics
- Migration guide

---

### 5. Commit Footer (Optional)

```bash
feat(HIFOS-123): migrate eSheet to Vue 3 Composition API

BREAKING CHANGE: eSheet component API has changed.
Old usage: <eSheet :lotId="id" />
New usage: <eSheet v-model:lotId="id" />

Migration guide: See docs/migration/esheet-vue3.md

Closes HIFOS-123
Refs HIFOS-100, HIFOS-101
```

**Footer Types:**

- `BREAKING CHANGE:` - Backward incompatible changes
- `Closes` - Close ticket
- `Refs` - Reference related tickets
- `Co-authored-by:` - Co-author

---

## ✅ Valid Commit Examples

### Example 1: Simple Feature

```bash
feat(HIFOS-101): add Lot search functionality in eSheet
```

---

### Example 2: Bug Fix with Description

```bash
fix(HIFOS-202): resolve null pointer in Grid rendering

The Grid component crashed when ESHEETITEMS array is empty.
Added null check before accessing array elements.

Steps to reproduce:
1. Search for Lot with no operation history
2. Grid throws NullPointerException

Fix:
- Add null/empty check in Grid component
- Display "No data" message when array is empty
```

---

### Example 3: Refactor with Performance Metrics

```bash
refactor(HIFOS-303): optimize eSheet API response time

Reduce API response time by implementing database query optimization
and Redis caching.

Performance improvements:
- Average response time: 2.5s → 0.3s (88% faster)
- Database queries: 15 → 3 (80% reduction)
- Cache hit rate: 0% → 85%

Technical changes:
- Add Redis cache for frequently accessed Lot data
- Optimize SQL queries with proper indexes
- Implement query result pagination
```

---

### Example 4: Multiple Changes (Breaking Change)

```bash
feat(HIFOS-404): migrate eSheet Grid to AG-Grid library

Replace custom Grid component with AG-Grid for better performance
and maintainability.

BREAKING CHANGE: Grid component props have changed.

Before:
<Grid :data="items" :columns="cols" />

After:
<AGGrid :rowData="items" :columnDefs="cols" />

Migration guide: docs/migration/ag-grid.md

Benefits:
- Built-in virtual scrolling
- Column resize/reorder out of the box
- Better TypeScript support
- Active community and documentation

Closes HIFOS-404
Refs HIFOS-400, HIFOS-401
```

---

### Example 5: Documentation

```bash
docs(HIFOS-503): add Git commit convention guide

Create comprehensive guide for team to follow consistent
commit message format.

Includes:
- Commit format specification
- All supported commit types with examples
- Valid/invalid examples
- Best practices and FAQ
- Checklist for developers
```

---

### Example 6: Test

```bash
test(HIFOS-601): add unit tests for Lot validation logic

Add comprehensive test coverage for Lot ID validation:
- Valid format: LOT12345678
- Invalid formats: empty, too short, special chars
- Edge cases: null, undefined, whitespace

Test coverage: 45% → 85%
```

---

### Example 7: Chore

```bash
chore(HIFOS-701): upgrade dependencies to latest versions

Update all dependencies to resolve security vulnerabilities
and improve compatibility.

Updated packages:
- vue: 3.2.0 → 3.4.0
- typescript: 4.9.0 → 5.3.0
- vite: 4.0.0 → 5.0.0

Security fixes: 3 high, 5 medium vulnerabilities resolved
```

---

### Example 8: Release

```bash
release(HIFOS-1001): release version 1.0.0

Release notes:
- New eSheet search functionality
- Move-In validation improvements
- Performance optimizations
- Bug fixes and stability improvements

Breaking changes: None

Migration guide: docs/release/v1.0.0.md
```

---

## ❌ Invalid Commit Examples

### 1. Missing Jira Ticket

```bash
❌ WRONG: feat: add eSheet search
❌ WRONG: fix: resolve grid bug
❌ WRONG: update code

✅ CORRECT: feat(HIFOS-101): add eSheet search
✅ CORRECT: fix(HIFOS-202): resolve grid rendering bug
✅ CORRECT: refactor(HIFOS-303): optimize database queries
```

**Reason:** Cannot trace which Jira task the commit belongs to.

---

### 2. Wrong Type Format

```bash
❌ WRONG: Feat(HIFOS-101): add search        (uppercase)
❌ WRONG: FEAT(HIFOS-101): add search        (uppercase)
❌ WRONG: feature(HIFOS-101): add search     (wrong name)
❌ WRONG: new(HIFOS-101): add search         (non-existent type)

✅ CORRECT: feat(HIFOS-101): add search
```

**Reason:** Type must be lowercase and correct name.

---

### 3. Missing Colon

```bash
❌ WRONG: feat(HIFOS-101) add search
❌ WRONG: feat(HIFOS-101)add search
❌ WRONG: feat(HIFOS-101)- add search

✅ CORRECT: feat(HIFOS-101): add search
```

**Reason:** Colon `:` is required to separate type/jira from message.

---

### 4. Unclear Message

```bash
❌ WRONG: feat(HIFOS-101): update
❌ WRONG: fix(HIFOS-202): fix bug
❌ WRONG: feat(HIFOS-303): WIP
❌ WRONG: refactor(HIFOS-404): change code
❌ WRONG: feat(HIFOS-505): done

✅ CORRECT: feat(HIFOS-101): add Lot search with barcode scanner
✅ CORRECT: fix(HIFOS-202): resolve null pointer in Grid rendering
✅ CORRECT: refactor(HIFOS-404): extract validation logic to utility
```

**Reason:** Message must specifically describe what changed.

---

### 5. Wrong Grammar

```bash
❌ WRONG: feat(HIFOS-101): Added search feature      (past tense)
❌ WRONG: feat(HIFOS-101): Adding search feature     (-ing form)
❌ WRONG: feat(HIFOS-101): Add search feature.       (period)
❌ WRONG: feat(HIFOS-101): Adds search feature       (adds s)

✅ CORRECT: feat(HIFOS-101): add search feature
```

**Reason:** Must use imperative mood (command).

---

### 6. Message Too Long

```bash
❌ WRONG: feat(HIFOS-101): add comprehensive eSheet search functionality with barcode scanner support and advanced filtering options including date range, status, and operator filters (>72 characters)

✅ CORRECT: feat(HIFOS-101): add eSheet search with barcode scanner

(Add details to body if needed)
```

**Reason:** Subject line must be ≤ 72 characters.

---

### 7. Multiple Changes in One Commit

```bash
❌ WRONG: feat(HIFOS-101): add search, fix grid bug, update docs

✅ CORRECT:
Commit 1: feat(HIFOS-101): add eSheet search functionality
Commit 2: fix(HIFOS-202): resolve grid rendering bug
Commit 3: docs(HIFOS-503): update eSheet documentation
```

**Reason:** Each commit should focus on one logical change.

---

### 8. Incomplete Code Commit

```bash
❌ WRONG: feat(HIFOS-101): WIP - search feature
❌ WRONG: feat(HIFOS-101): temp commit
❌ WRONG: feat(HIFOS-101): save work

✅ CORRECT: Only commit when code is complete and tested
```

**Reason:** Commit must be a complete unit that can be deployed.

---

## 🛠️ Implementation Guide

### Step 1: Identify Type of Change

**Ask yourself:**

- What am I doing? → Choose `type`
- Which Jira ticket is this for? → Get `jira`
- What is the main change? → Write `message`

**Example:**

```
I'm doing: Add Lot search feature
Task: HIFOS-101
Change: Add search box and API call

→ feat(HIFOS-101): add Lot search functionality
```

---

### Step 2: Write Commit Message

**Template:**

```bash
<type>(<jira>): <verb> <what>

# Examples:
feat(HIFOS-101): add user authentication
fix(HIFOS-202): resolve null pointer in Grid
refactor(HIFOS-303): optimize database queries
```

**Common Verbs:**

- `add` - add new
- `remove` - remove
- `update` - update
- `fix` - fix error
- `resolve` - resolve
- `implement` - implement
- `refactor` - restructure
- `optimize` - optimize
- `improve` - improve
- `migrate` - migrate/upgrade

---

### Step 3: Review Before Commit

**Checklist:**

- [ ] Correct format `<type>(<jira>): <message>`?
- [ ] Type correct (feat/fix/refactor/...)?
- [ ] Jira ticket correct (HIFOS-XXX)?
- [ ] Message clear and specific?
- [ ] Message ≤ 72 characters?
- [ ] Using imperative mood (add, fix, update)?
- [ ] No period at end?
- [ ] Code tested and working?

---

### Step 4: Perform Commit

**Method 1: Command Line**

```bash
# Stage changes
git add .

# Commit with message
git commit -m "feat(HIFOS-101): add Lot search functionality"

# Push to remote
git push origin feature/HIFOS-101-lot-search
```

**Method 2: VS Code**

1. Open Source Control (Ctrl+Shift+G)
2. Stage changes
3. Enter commit message following format
4. Click ✓ Commit
5. Push to remote

**Method 3: Git GUI Tools**

- SourceTree
- GitKraken
- GitHub Desktop

---

### Step 5: Handle Wrong Commits

**Fix last commit message (not pushed):**

```bash
# Fix message of just-created commit
git commit --amend -m "feat(HIFOS-101): add Lot search functionality"

# If already pushed, need force push (DANGEROUS - only on personal branch)
git push --force-with-lease
```

**Create new commit to fix (already pushed):**

```bash
# If already pushed and others have pulled, create new commit
git commit -m "fix(HIFOS-101): correct search validation logic"
```

---

## ✔️ Pre-commit Checklist

### Pre-commit Checklist

```
□ Code tested and working correctly
□ No console.log() or debug code
□ Code formatted (prettier/eslint)
□ No conflicts with main branch
□ Commit message follows format
□ Jira ticket status updated
□ Code review (if needed) approved
```

### Commit Message Checklist

```
□ Format: <type>(<jira>): <message>
□ Type correct: feat/fix/refactor/test/docs/style/chore/perf/revert/release
□ Jira ticket correct format: HIFOS-XXX or MES-XXX
□ Message clear and specific
□ Message ≤ 72 characters
□ Using imperative mood (add, fix, update)
□ No period at end
□ Lowercase first letter (except proper nouns)
```

---

## ❓ FAQ - Frequently Asked Questions

### Q1: What if one commit relates to multiple Jira tickets?

**A:** Choose the main ticket as reference, mention other tickets in body or footer.

```bash
feat(HIFOS-101): add eSheet search functionality

This feature also addresses requirements from HIFOS-102 and HIFOS-103.

Refs HIFOS-102, HIFOS-103
```

---

### Q2: Small commits or large commits?

**A:** Small commits, focused on one logical change.

```bash
✅ GOOD: 3 small commits
- feat(HIFOS-101): add search input component
- feat(HIFOS-101): implement search API call
- feat(HIFOS-101): add search result display

❌ NOT GOOD: 1 large commit
- feat(HIFOS-101): add complete search feature
```

**Benefits:**

- Easier to review
- Easier to revert if error
- Easier to cherry-pick
- Clear history

---

### Q3: When to add Body to commit?

**A:** When need to explain:

- **Why** (why) change
- **What** (what) changed (if complex)
- **How** (how) implement (if needed)
- Breaking changes
- Performance metrics
- Migration guide

```bash
feat(HIFOS-101): migrate to Vue 3 Composition API

BREAKING CHANGE: Component API has changed.

Why: Vue 3 provides better TypeScript support and performance.
What: Migrated all components from Options API to Composition API.
How: Used <script setup> syntax with TypeScript.

Migration guide: docs/vue3-migration.md
```

---

### Q4: Can I use Vietnamese in commit message?

**A:** English is recommended, but Vietnamese acceptable if:

- Team is all Vietnamese speakers
- Business terminology hard to translate
- Team has agreed

```bash
✅ RECOMMENDED:
feat(HIFOS-101): add Lot search functionality

✅ ACCEPTABLE:
feat(HIFOS-101): thêm chức năng tìm kiếm Lot

❌ AVOID:
feat(HIFOS-101): thêm tính năng search Lot (mixed Vietnamese-English)
```

---

### Q5: How to remember all the rules?

**A:** Use automation tools:

**1. Commitlint** - Validate commit message

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

**2. Husky** - Git hooks

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

**3. Commitizen** - Interactive commit

```bash
npm install --save-dev commitizen
npx commitizen init cz-conventional-changelog --save-dev --save-exact
```

**4. VS Code Extension**

- Conventional Commits
- Git Commit Message Helper

---

### Q6: What if I forgot to commit in correct format?

**A:** 3 ways to handle:

**Method 1: Amend commit (not pushed)**

```bash
git commit --amend -m "feat(HIFOS-101): add search functionality"
```

**Method 2: Rebase interactive (not pushed)**

```bash
git rebase -i HEAD~3  # Fix 3 recent commits
# Choose 'reword' for commit to fix
```

**Method 3: New commit (already pushed)**

```bash
# Don't fix old commit, create new correct commit
git commit -m "feat(HIFOS-101): improve search performance"
```

---

### Q7: Do I need commit message for merge commit?

**A:** Depends on situation:

**Merge from feature branch:**

```bash
# Auto-generated
git merge feature/HIFOS-101-search

# Or custom message
git merge feature/HIFOS-101-search -m "feat(HIFOS-101): merge search feature"
```

**Merge conflict resolution:**

```bash
git commit -m "fix(HIFOS-101): resolve merge conflicts in eSheet component"
```

---

### Q8: When to use `BREAKING CHANGE`?

**A:** When making backward incompatible changes:

```bash
feat(HIFOS-101): change API response format

BREAKING CHANGE: API response structure has changed.

Before:
{ data: [...], total: 100 }

After:
{ items: [...], count: 100, page: 1 }

Migration: Update all API consumers to use new field names.
```

**Examples of Breaking Changes:**

- Change API endpoint name
- Change response structure
- Remove function/component

---
