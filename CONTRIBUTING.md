## <a name="commit"></a> Commit Message Guidelines

We have precise rules over how our git commit messages should be formatted. This leads to more readable messages that are easy to follow when looking through the project history.

### Commit Message Format

Each commit message consists of a **header**, a **body** and a **footer**. The header has a special format that includes a **type**, a **scope** and a **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** with **type** is mandatory. The **scope** of the header is optional as far as the automated PR checks are concerned, but be advised that PR reviewers **may request** you provide an applicable scope.

Any line of the commit message should not be longer than 72 characters! This allows the message to be easier to read on GitHub as well as in various git tools.

The footer should contain a reference to a GitHub issue (e.g. `#1234`) using the [GitHub closing-keyword syntax](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) so the issue auto-closes when the PR merges.

Example 1:

```
feat(telemetry): Add new MQTT events

Events are now emitted over various /mps topics on MQTT for success/failures
as they occur throughout the service.

Closes: #1234
```

### Revert

If the commit reverts a previous commit, it should begin with `revert: `, followed by the header of the reverted commit. In the body it should say: `This reverts commit <hash>.`, where the hash is the SHA of the commit being reverted.

### Type

Must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the CI/CD pipeline or build system or external dependencies (example scopes: travis, jenkins, makefile)
- **ci**: Changes provided by DevOps for CI purposes.
- **revert**: Reverts a previous commit.

### Scope

Should be one of the following:
Modules:

- **apf**: A change or addition to amt port forwarding functionality
- **api**: A change or addition to REST functionality
- **cira**: A change or addition to client initiated remote access functionality
- **config**: A change or addition to service configuration
- **db**: A change or addition to database calls or functionality
- **deps**: A change or addition to dependencies (primarily used by dependabot)
- **deps-dev**: A change or addition to developer dependencies (primarily used by dependabot)
- **docker**: A change or addition to docker file or composition
- **events**: A change or addition to eventing from the service
- **gh-actions**: A change or addition to GitHub actions
- **health**: A change or addition to health checks
- **redir**: A change or addition to redirection functionality
- **secrets**: A change or addition to secret store calls or functionality
- **utils**: A change or addition to the utility functions
- _no scope_: If no scope is provided, it is assumed the PR does not apply to the above scopes

### Body

Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes".
Here is detailed guideline on how to write the body of the commit message ([Reference](https://chris.beams.io/posts/git-commit/)):

```
More detailed explanatory text, if necessary. Wrap it to about 72
characters or so. In some contexts, the first line is treated as the
subject of the commit and the rest of the text as the body. The
blank line separating the summary from the body is critical (unless
you omit the body entirely); various tools like `log`, `shortlog`
and `rebase` can get confused if you run the two together.

Explain the problem that this commit is solving. Focus on why you
are making this change as opposed to how (the code explains that).
Are there side effects or other unintuitive consequences of this
change? Here's the place to explain them.

Further paragraphs come after blank lines.

 - Bullet points are okay, too

 - Typically a hyphen or asterisk is used for the bullet, preceded
   by a single space, with blank lines in between, but conventions
   vary here
```

### Footer

The footer should contain a reference to the GitHub issue this commit **Closes**, **Fixes**, or **Resolves** (e.g. `Closes: #1234`). See [GitHub's closing-keyword syntax](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) for the keywords that trigger auto-close on merge.
The footer should contain any information about **Breaking Changes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines.

### Pull Requests practices

- PR author is responsible to merge its own PR after review has been done and CI has passed.
- When merging, make sure git linear history is preserved. PR author should select a merge option (`Rebase and merge` or `Squash and merge`) based on which option will fit the best to the git linear history.
- PR topic should follow the same guidelines as the header of the [Git Commit Message](#commit-message-format)
