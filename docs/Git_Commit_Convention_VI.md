# Git Commit Convention

## 📋 Mục lục

1. [Tổng quan](#tổng-quan)
2. [Định dạng Commit](#định-dạng-commit)
3. [Các loại Commit (Types)](#các-loại-commit-types)
4. [Quy tắc viết Message](#quy-tắc-viết-message)
5. [Ví dụ Commit hợp lệ](#ví-dụ-commit-hợp-lệ)
6. [Ví dụ Commit KHÔNG hợp lệ](#ví-dụ-commit-không-hợp-lệ)
7. [Hướng dẫn thực hành](#hướng-dẫn-thực-hành)
8. [Checklist trước khi Commit](#checklist-trước-khi-commit)
9. [FAQ - Câu hỏi thường gặp](#faq---câu-hỏi-thường-gặp)

---

## 🎯 Tổng quan

### Mục đích

- Đảm bảo lịch sử commit rõ ràng, dễ theo dõi
- Liên kết trực tiếp giữa code và Jira ticket
- Hỗ trợ tự động tạo changelog và release notes
- Giúp team review code hiệu quả hơn

### Nguyên tắc vàng

✅ **BẮT BUỘC** có Jira ticket reference  
✅ **BẮT BUỘC** sử dụng đúng commit type  
✅ **BẮT BUỘC** viết message mô tả rõ ràng  
✅ **KHUYẾN KHÍCH** viết bằng tiếng Anh

---

## 📝 Định dạng Commit

### Cấu trúc cơ bản

```
<type>(<jira>): <message>

[optional body]

[optional footer]
```

### Giải thích từng phần

| Phần        | Bắt buộc | Mô tả                      | Ví dụ                             |
| ----------- | -------- | -------------------------- | --------------------------------- |
| **type**    | ✅ Có    | Loại thay đổi              | `feat`, `fix`, `refactor`         |
| **jira**    | ✅ Có    | Mã Jira ticket             | `HIFOS-123`, `MES-456`            |
| **message** | ✅ Có    | Mô tả ngắn gọn (≤72 ký tự) | `add eSheet search functionality` |
| **body**    | ❌ Không | Mô tả chi tiết (nếu cần)   | Giải thích why, what, how         |
| **footer**  | ❌ Không | Metadata bổ sung           | `Breaking Change`, `Closes #123`  |

### Quy tắc format

```
✅ ĐÚNG: feat(HIFOS-123): add user authentication
✅ ĐÚNG: fix(MES-456): resolve null pointer in eSheet grid
✅ ĐÚNG: refactor(HIFOS-789): optimize database queries

❌ SAI: feat: add user authentication          (thiếu Jira)
❌ SAI: HIFOS-123: add user authentication     (thiếu type)
❌ SAI: feat(HIFOS-123) add authentication     (thiếu dấu :)
❌ SAI: Feat(HIFOS-123): add authentication    (type viết hoa)
```

---

## 🏷️ Các loại Commit (Types)

### 1. `feat` - Feature mới

**Khi nào dùng:**

- Thêm tính năng mới cho người dùng
- Thêm API endpoint mới
- Thêm component/screen mới

**Ví dụ:**

```bash
feat(HIFOS-101): add eSheet search functionality
feat(HIFOS-102): implement Move-In validation logic
feat(HIFOS-103): create Lot Status dashboard
```

---

### 2. `fix` - Sửa lỗi

**Khi nào dùng:**

- Sửa bug trong production
- Sửa lỗi logic nghiệp vụ
- Sửa lỗi UI/UX

**Ví dụ:**

```bash
fix(HIFOS-201): resolve null pointer exception in grid rendering
fix(HIFOS-202): correct Recipe validation in Move-In screen
fix(HIFOS-203): fix incorrect color display for HOLD status
```

---

### 3. `refactor` - Tái cấu trúc code

**Khi nào dùng:**

- Cải thiện cấu trúc code mà không thay đổi chức năng
- Tối ưu hiệu năng
- Loại bỏ code duplicate

**Ví dụ:**

```bash
refactor(HIFOS-301): optimize eSheet grid rendering performance
refactor(HIFOS-302): extract common validation logic to utility
refactor(HIFOS-303): simplify Drawer Menu enable/disable logic
```

---

### 4. `test` - Thêm/sửa test

**Khi nào dùng:**

- Thêm unit test mới
- Thêm integration test
- Sửa test case hiện tại

**Ví dụ:**

```bash
test(HIFOS-401): add unit tests for Lot validation
test(HIFOS-402): add integration tests for Move-In API
test(HIFOS-403): update test cases for Recipe change logic
```

---

### 5. `docs` - Cập nhật tài liệu

**Khi nào dùng:**

- Thêm/sửa README
- Cập nhật API documentation
- Thêm code comments
- Tạo technical specification

**Ví dụ:**

```bash
docs(HIFOS-501): add eSheet migration guide
docs(HIFOS-502): update API documentation for Move-In endpoint
docs(HIFOS-503): create Git commit convention document
```

---

### 6. `style` - Format code

**Khi nào dùng:**

- Format code (prettier, eslint)
- Sửa indentation, spacing
- Không thay đổi logic

**Ví dụ:**

```bash
style(HIFOS-601): format code with prettier
style(HIFOS-602): fix eslint warnings in eSheet component
style(HIFOS-603): update import order according to style guide
```

---

### 7. `chore` - Công việc bảo trì

**Khi nào dùng:**

- Cập nhật dependencies
- Thay đổi build configuration
- Cập nhật CI/CD pipeline

**Ví dụ:**

```bash
chore(HIFOS-701): upgrade Vue to version 3.4
chore(HIFOS-702): update webpack configuration
chore(HIFOS-703): add pre-commit hooks for linting
```

---

### 8. `perf` - Cải thiện hiệu năng

**Khi nào dùng:**

- Tối ưu tốc độ xử lý
- Giảm memory usage
- Cải thiện rendering performance

**Ví dụ:**

```bash
perf(HIFOS-801): optimize Grid rendering with virtual scrolling
perf(HIFOS-802): reduce API response time by 50%
perf(HIFOS-803): implement lazy loading for eSheet data
```

---

### 9. `revert` - Hoàn tác commit

**Khi nào dùng:**

- Revert một commit trước đó
- Rollback thay đổi gây lỗi

**Ví dụ:**

```bash
revert(HIFOS-901): revert "feat(HIFOS-101): add eSheet search"

This reverts commit abc123def456.
Reason: Causing performance issues in production.
```

---

### 10. `release` - Phát hành bản release

**Khi nào dùng:**

- Tạo bản release mới
- Cập nhật version
- Tạo release tag

**Ví dụ:**

```bash
release(HIFOS-1001): release version 1.0.0
release(HIFOS-1002): release version 2.1.0 with new features
release(HIFOS-1003): hotfix release version 1.0.1
```

---

## ✍️ Quy tắc viết Message

### 1. Độ dài Message

```
✅ ĐÚNG: feat(HIFOS-123): add user authentication with JWT
✅ ĐÚNG: fix(HIFOS-456): resolve grid rendering issue

❌ SAI: feat(HIFOS-123): add user authentication with JWT token and implement refresh token mechanism with Redis cache (quá dài, >72 ký tự)
```

**Quy tắc:**

- Subject line (dòng đầu): **≤ 72 ký tự**
- Body (nếu có): mỗi dòng **≤ 80 ký tự**

---

### 2. Ngữ pháp và Cấu trúc

```
✅ ĐÚNG: feat(HIFOS-123): add user login feature
✅ ĐÚNG: fix(HIFOS-456): resolve null pointer exception

❌ SAI: feat(HIFOS-123): Added user login feature    (dùng past tense)
❌ SAI: feat(HIFOS-123): Add user login feature.     (có dấu chấm)
❌ SAI: feat(HIFOS-123): Adding user login feature   (dùng -ing)
```

**Quy tắc:**

- Dùng **imperative mood** (mệnh lệnh): `add`, `fix`, `update`
- **KHÔNG** dùng past tense: ~~`added`~~, ~~`fixed`~~
- **KHÔNG** dùng -ing form: ~~`adding`~~, ~~`fixing`~~
- **KHÔNG** có dấu chấm cuối câu
- Viết thường chữ cái đầu (trừ tên riêng)

---

### 3. Nội dung Message

```
✅ ĐÚNG: feat(HIFOS-123): add validation for Lot ID format
✅ ĐÚNG: fix(HIFOS-456): prevent duplicate Move-In requests

❌ SAI: feat(HIFOS-123): update code           (quá chung chung)
❌ SAI: fix(HIFOS-456): fix bug                (không rõ bug gì)
❌ SAI: feat(HIFOS-123): WIP                   (không mô tả)
```

**Quy tắc:**

- Mô tả **CỤ THỂ** thay đổi gì
- Tập trung vào **WHAT** (làm gì), không phải **HOW** (làm thế nào)
- Tránh từ chung chung: ~~`update`~~, ~~`fix bug`~~, ~~`change`~~

---

### 4. Commit Body (Optional)

Khi cần giải thích chi tiết, thêm body sau một dòng trống:

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

**Khi nào cần Body:**

- Thay đổi phức tạp cần giải thích
- Breaking changes
- Performance improvements với số liệu
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

**Các loại Footer:**

- `BREAKING CHANGE:` - Thay đổi không tương thích ngược
- `Closes` - Đóng ticket
- `Refs` - Tham chiếu ticket liên quan
- `Co-authored-by:` - Đồng tác giả

---

## ✅ Ví dụ Commit hợp lệ

### Ví dụ 1: Feature đơn giản

```bash
feat(HIFOS-101): add Lot search functionality in eSheet
```

---

### Ví dụ 2: Bug fix với mô tả

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

### Ví dụ 3: Refactor với performance metrics

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

### Ví dụ 4: Multiple changes (Breaking Change)

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

### Ví dụ 5: Documentation

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

### Ví dụ 6: Test

```bash
test(HIFOS-601): add unit tests for Lot validation logic

Add comprehensive test coverage for Lot ID validation:
- Valid format: LOT12345678
- Invalid formats: empty, too short, special chars
- Edge cases: null, undefined, whitespace

Test coverage: 45% → 85%
```

---

### Ví dụ 7: Chore

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

## ❌ Ví dụ Commit KHÔNG hợp lệ

### 1. Thiếu Jira ticket

```bash
❌ SAI: feat: add eSheet search
❌ SAI: fix: resolve grid bug
❌ SAI: update code

✅ ĐÚNG: feat(HIFOS-101): add eSheet search
✅ ĐÚNG: fix(HIFOS-202): resolve grid rendering bug
✅ ĐÚNG: refactor(HIFOS-303): optimize database queries
```

**Lý do:** Không thể trace được commit thuộc task nào trong Jira.

---

### 2. Sai format type

```bash
❌ SAI: Feat(HIFOS-101): add search        (viết hoa)
❌ SAI: FEAT(HIFOS-101): add search        (viết hoa)
❌ SAI: feature(HIFOS-101): add search     (sai tên type)
❌ SAI: new(HIFOS-101): add search         (type không tồn tại)

✅ ĐÚNG: feat(HIFOS-101): add search
```

**Lý do:** Type phải viết thường và đúng tên quy định.

---

### 3. Thiếu dấu hai chấm

```bash
❌ SAI: feat(HIFOS-101) add search
❌ SAI: feat(HIFOS-101)add search
❌ SAI: feat(HIFOS-101)- add search

✅ ĐÚNG: feat(HIFOS-101): add search
```

**Lý do:** Dấu `:` là bắt buộc để phân tách type/jira với message.

---

### 4. Message không rõ ràng

```bash
❌ SAI: feat(HIFOS-101): update
❌ SAI: fix(HIFOS-202): fix bug
❌ SAI: feat(HIFOS-303): WIP
❌ SAI: refactor(HIFOS-404): change code
❌ SAI: feat(HIFOS-505): done

✅ ĐÚNG: feat(HIFOS-101): add Lot search with barcode scanner
✅ ĐÚNG: fix(HIFOS-202): resolve null pointer in Grid rendering
✅ ĐÚNG: refactor(HIFOS-404): extract validation logic to utility
```

**Lý do:** Message phải mô tả cụ thể thay đổi gì.

---

### 5. Sai ngữ pháp

```bash
❌ SAI: feat(HIFOS-101): Added search feature      (past tense)
❌ SAI: feat(HIFOS-101): Adding search feature     (-ing form)
❌ SAI: feat(HIFOS-101): Add search feature.       (có dấu chấm)
❌ SAI: feat(HIFOS-101): Adds search feature       (thêm s)

✅ ĐÚNG: feat(HIFOS-101): add search feature
```

**Lý do:** Phải dùng imperative mood (mệnh lệnh).

---

### 6. Message quá dài

```bash
❌ SAI: feat(HIFOS-101): add comprehensive eSheet search functionality with barcode scanner support and advanced filtering options including date range, status, and operator filters (>72 ký tự)

✅ ĐÚNG: feat(HIFOS-101): add eSheet search with barcode scanner

(Thêm chi tiết vào body nếu cần)
```

**Lý do:** Subject line phải ≤ 72 ký tự.

---

### 7. Nhiều thay đổi trong 1 commit

```bash
❌ SAI: feat(HIFOS-101): add search, fix grid bug, update docs

✅ ĐÚNG:
Commit 1: feat(HIFOS-101): add eSheet search functionality
Commit 2: fix(HIFOS-202): resolve grid rendering bug
Commit 3: docs(HIFOS-503): update eSheet documentation
```

**Lý do:** Mỗi commit nên tập trung vào 1 thay đổi logic.

---

### 8. Commit code chưa hoàn thành

```bash
❌ SAI: feat(HIFOS-101): WIP - search feature
❌ SAI: feat(HIFOS-101): temp commit
❌ SAI: feat(HIFOS-101): save work

✅ ĐÚNG: Chỉ commit khi code đã hoàn thành và test
```

**Lý do:** Commit phải là đơn vị hoàn chỉnh, có thể deploy được.

---

## 🛠️ Hướng dẫn thực hành

### Bước 1: Xác định loại thay đổi

**Tự hỏi:**

- Tôi đang làm gì? → Chọn `type`
- Task này thuộc ticket Jira nào? → Lấy `jira`
- Thay đổi chính là gì? → Viết `message`

**Ví dụ:**

```
Tôi đang: Thêm tính năng tìm kiếm Lot
Task: HIFOS-101
Thay đổi: Thêm search box và API call

→ feat(HIFOS-101): add Lot search functionality
```

---

### Bước 2: Viết commit message

**Template:**

```bash
<type>(<jira>): <verb> <what>

# Ví dụ:
feat(HIFOS-101): add user authentication
fix(HIFOS-202): resolve null pointer in Grid
refactor(HIFOS-303): optimize database queries
```

**Động từ thường dùng:**

- `add` - thêm mới
- `remove` - xóa bỏ
- `update` - cập nhật
- `fix` - sửa lỗi
- `resolve` - giải quyết
- `implement` - triển khai
- `refactor` - tái cấu trúc
- `optimize` - tối ưu
- `improve` - cải thiện
- `migrate` - di chuyển/nâng cấp

---

### Bước 3: Review trước khi commit

**Checklist:**

- [ ] Có đúng format `<type>(<jira>): <message>`?
- [ ] Type có đúng (feat/fix/refactor/...)?
- [ ] Jira ticket có đúng (HIFOS-XXX)?
- [ ] Message có rõ ràng, cụ thể?
- [ ] Message ≤ 72 ký tự?
- [ ] Dùng imperative mood (add, fix, update)?
- [ ] Không có dấu chấm cuối câu?
- [ ] Code đã test và hoạt động?

---

### Bước 4: Thực hiện commit

**Cách 1: Command line**

```bash
# Stage changes
git add .

# Commit với message
git commit -m "feat(HIFOS-101): add Lot search functionality"

# Push to remote
git push origin feature/HIFOS-101-lot-search
```

**Cách 2: VS Code**

1. Mở Source Control (Ctrl+Shift+G)
2. Stage changes
3. Nhập commit message theo format
4. Click ✓ Commit
5. Push to remote

**Cách 3: Git GUI tools**

- SourceTree
- GitKraken
- GitHub Desktop

---

### Bước 5: Xử lý khi commit sai

**Sửa commit message cuối cùng:**

```bash
# Sửa message của commit vừa tạo (chưa push)
git commit --amend -m "feat(HIFOS-101): add Lot search functionality"

# Nếu đã push, cần force push (NGUY HIỂM - chỉ dùng trên branch cá nhân)
git push --force-with-lease
```

**Tạo commit mới để sửa:**

```bash
# Nếu đã push và có người khác pull, tạo commit mới
git commit -m "fix(HIFOS-101): correct search validation logic"
```

---

## ✔️ Checklist trước khi Commit

### Pre-commit Checklist

```
□ Code đã được test và hoạt động đúng
□ Không có console.log() hoặc debug code
□ Code đã được format (prettier/eslint)
□ Không có conflict với branch chính
□ Commit message theo đúng format
□ Jira ticket đã được cập nhật status
□ Code review (nếu cần) đã được approve
```

### Commit Message Checklist

```
□ Format: <type>(<jira>): <message>
□ Type đúng: feat/fix/refactor/test/docs/style/chore/perf/revert/release
□ Jira ticket đúng format: HIFOS-XXX hoặc MES-XXX
□ Message rõ ràng, cụ thể
□ Message ≤ 72 ký tự
□ Dùng imperative mood (add, fix, update)
□ Không có dấu chấm cuối câu
□ Viết thường chữ cái đầu (trừ tên riêng)
```

---

## ❓ FAQ - Câu hỏi thường gặp

### Q1: Nếu 1 commit liên quan đến nhiều Jira ticket thì làm sao?

**A:** Chọn ticket chính làm reference, các ticket phụ đề cập trong body hoặc footer.

```bash
feat(HIFOS-101): add eSheet search functionality

This feature also addresses requirements from HIFOS-102 and HIFOS-103.

Refs HIFOS-102, HIFOS-103
```

---

### Q2: Commit nhỏ hay commit lớn?

**A:** Commit nhỏ, tập trung vào 1 thay đổi logic.

```bash
✅ TỐT: 3 commits nhỏ
- feat(HIFOS-101): add search input component
- feat(HIFOS-101): implement search API call
- feat(HIFOS-101): add search result display

❌ KHÔNG TỐT: 1 commit lớn
- feat(HIFOS-101): add complete search feature
```

**Lợi ích:**

- Dễ review
- Dễ revert nếu có lỗi
- Dễ cherry-pick
- Lịch sử rõ ràng

---

### Q3: Khi nào cần thêm Body vào commit?

**A:** Khi cần giải thích:

- **Why** (tại sao) thay đổi
- **What** (cái gì) thay đổi (nếu phức tạp)
- **How** (như thế nào) implement (nếu cần)
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

### Q4: Có thể dùng tiếng Việt trong commit message không?

**A:** Khuyến khích dùng tiếng Anh, nhưng có thể dùng tiếng Việt nếu:

- Team toàn người Việt
- Thuật ngữ nghiệp vụ khó dịch
- Đã thống nhất trong team

```bash
✅ KHUYẾN KHÍCH:
feat(HIFOS-101): add Lot search functionality

✅ CHẤP NHẬN ĐƯỢC:
feat(HIFOS-101): thêm chức năng tìm kiếm Lot

❌ TRÁNH:
feat(HIFOS-101): thêm tính năng search Lot (lẫn lộn Việt-Anh)
```

---

### Q5: Làm sao để nhớ tất cả các quy tắc?

**A:** Sử dụng tools tự động:

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

### Q6: Nếu quên không commit theo format thì sao?

**A:** Có 3 cách xử lý:

**Cách 1: Amend commit (chưa push)**

```bash
git commit --amend -m "feat(HIFOS-101): add search functionality"
```

**Cách 2: Rebase interactive (chưa push)**

```bash
git rebase -i HEAD~3  # Sửa 3 commit gần nhất
# Chọn 'reword' cho commit cần sửa
```

**Cách 3: Commit mới (đã push)**

```bash
# Không sửa commit cũ, tạo commit mới đúng format
git commit -m "feat(HIFOS-101): improve search performance"
```

---

### Q7: Có cần commit message cho merge commit không?

**A:** Tùy trường hợp:

**Merge từ feature branch:**

```bash
# Tự động generate
git merge feature/HIFOS-101-search

# Hoặc custom message
git merge feature/HIFOS-101-search -m "feat(HIFOS-101): merge search feature"
```

**Merge conflict resolution:**

```bash
git commit -m "fix(HIFOS-101): resolve merge conflicts in eSheet component"
```

---

### Q8: Khi nào dùng `BREAKING CHANGE`?

**A:** Khi thay đổi không tương thích ngược (backward incompatible):

```bash
feat(HIFOS-101): change API response format

BREAKING CHANGE: API response structure has changed.

Before:
{ data: [...], total: 100 }

After:
{ items: [...], count: 100, page: 1 }

Migration: Update all API consumers to use new field names.
```

**Ví dụ Breaking Changes:**

- Đổi tên API endpoint
- Thay đổi cấu trúc response
- Xóa bỏ function/component
