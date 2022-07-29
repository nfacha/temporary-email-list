This repository contains a curated temporary / disposable email domain list.

The list is available in [TXT Format](https://raw.githubusercontent.com/nfacha/temporary-email-list/master/list.txt) and [JSON Format](https://raw.githubusercontent.com/nfacha/temporary-email-list/master/list.json).


There is also a REST API available to determine if a domain is a temporary email domain.
Documentation can be found on https://api.facha.dev

But it is basically a GET request to https://api.facha.dev/v1/temporary-email/DOMAIN.COM (replacing DOMAIN.COM by your query), and you will get a JSON response as such:
```json
{
  "temporary": true
}
```
