# Important

To add this chart to another as dependency, execute

```bash
mkdir -p ./charts/PATH-TO-MY-CHART/charts
ln -sr ./charts/utils-templates ./charts/PATH-TO-MY-CHART/charts/utils-templates
```
This requires the `ln` or `gln` command for GNU `coreutils`. 


Then check for broken links with:

```
find -L . -type l
```