# Common code smells and remediation patterns

## Intent

Use this reference during code-first review to map visible SwiftUI patterns to likely runtime costs and safer remediation guidance.

## High-priority smells

### Expensive formatters in `body`

```swift
var body: some View {
    let number = NumberFormatter()
    let measure = MeasurementFormatter()
    Text(measure.string(from: .init(value: meters, unit: .meters)))
}
```

Prefer cached formatters in a model or dedicated helper:

```swift
final class DistanceFormatter {
    static let shared = DistanceFormatter()
    let number = NumberFormatter()
    let measure = MeasurementFormatter()
}
```

### Heavy computed properties

```swift
var filtered: [Item] {
    items.filter { $0.isEnabled }
}
```

Prefer deriving this once per meaningful input change in a model/helper, or store derived view-owned state only when the view truly owns the transformation lifecycle.

### Sorting or filtering inside `body`

```swift
List {
    ForEach(items.sorted(by: sortRule)) { item in
        Row(item)
    }
}
```

Prefer sorting before render work begins:

```swift
let sortedItems = items.sorted(by: sortRule)
```

### Inline filtering inside `ForEach`

```swift
ForEach(items.filter { $0.isEnabled }) { item in
    Row(item)
}
```

Prefer a prefiltered collection with stable identity.

### Unstable identity

```swift
ForEach(items, id: \.self) { item in
    Row(item)
}
```

Avoid `id: \.self` for non-stable values or collections that reorder. Use a stable domain identifier.

### Top-level conditional view swapping

```swift
var content: some View {
    if isEditing {
        editingView
    } else {
        readOnlyView
    }
}
```

Prefer one stable base view and localize conditions to sections or modifiers. This reduces root identity churn and makes diffing cheaper.

### View-tree-breaking styling helpers

```swift
Text(title)
    .if(isHighlighted) { $0.bold() }
```

If the condition only changes style or behavior, prefer a value-based modifier:

```swift
Text(title)
    .fontWeight(isHighlighted ? .bold : .regular)
```

Custom `.if`-style helpers often swap structural identity even when the visual change looks small.

### Variable root counts inside `ForEach`

```swift
ForEach(items) { item in
    if item.isVisible {
        Row(item)
    }
}
```

Prefer filtering before iteration, or keep one stable root view per element if the condition must stay inside the row.

### Force-refresh identity

```swift
content.id(UUID())
```

Treat `.id(...)` as an identity tool, not a refresh hammer. Changing it resets state and defeats diffing.

### Image decoding on the main thread

```swift
Image(uiImage: UIImage(data: data)!)
```

Prefer decode and downsample work off the main thread, then store the processed image.

## Observation fan-out

### Broad `@Observable` reads on iOS 17+

```swift
@Observable final class Model {
    var items: [Item] = []
}

var body: some View {
    Row(isFavorite: model.items.contains(item))
}
```

If many views read the same broad collection or root model, small changes can fan out into wide invalidation. Prefer narrower derived inputs, smaller observable surfaces, or per-item state closer to the leaf views.

### High-volume environment writes

```swift
.environment(\.scrollOffset, scrollOffset)
```

Rapidly changing environment values wake every environment-reading descendant. Prefer a stable observable reference in the environment and mutate the one field that interested leaves read.

### Wide geometry readers

Large subtrees under `GeometryReader` or `ScrollViewReader` can react to layout changes they do not care about. Keep reader scope tight and move unrelated stateful content outside.

### Broad `ObservableObject` reads on iOS 16 and earlier

```swift
final class Model: ObservableObject {
    @Published var items: [Item] = []
}
```

The same warning applies to legacy observation. Avoid having many descendants observe a large shared object when they only need one derived field.

## Closure and binding smells

### Stored builder closures

```swift
struct Container<Content: View>: View {
    let content: () -> Content

    var body: some View {
        content()
    }
}
```

Prefer evaluating a non-escaping builder in `init` and storing the built view. Stored closures are harder for SwiftUI to compare and can capture more parent state than intended.

### Broad action captures

```swift
Button("Retry") {
    viewModel.retry()
}
```

In hot paths, prefer a method reference or a narrower capture when that avoids dragging large, frequently changing state into the closure value.

### Manual bindings in hot paths

```swift
Toggle("Enabled", isOn: Binding(
    get: { model.isEnabled },
    set: { model.isEnabled = $0 }
))
```

Prefer `$model.isEnabled` when a key-path binding exists. Manual bindings store closures and are harder to diff between updates.

## Remediation notes

### `@State` is not a generic cache

Use `@State` for view-owned state and derived values that intentionally belong to the view lifecycle. Do not move arbitrary expensive computation into `@State` unless you also define when and why it updates.

Better alternatives:
- precompute in the model or store
- update derived state in response to a specific input change
- memoize in a dedicated helper
- preprocess on a background task before rendering

### `@ObservationIgnored` should be surgical

Use it for mutable non-render state such as caches, tasks, cancellables, services, and lazy dependencies that views do not read. Do not apply it to immutable `let` dependencies or blanket-ignore model state just to silence updates.

### `equatable()` is conditional guidance

Use `equatable()` only when:
- equality is cheaper than recomputing the subtree, and
- the view inputs are value-semantic and stable enough for meaningful equality checks

Do not apply `equatable()` as a blanket fix for all redraws.

## Triage order

When multiple smells appear together, prioritize in this order:
1. Broad invalidation and observation fan-out
2. Unstable identity and list churn
3. Main-thread work during render or lifecycle modifiers
4. Stored closures or manual bindings in hot paths
5. Image decode or resize cost
6. Layout and animation complexity
