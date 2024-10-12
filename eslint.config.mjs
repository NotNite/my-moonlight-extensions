import config from "@moonlight-mod/eslint-config";

export default [
  ...config,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["src/*"],
              message: "Use relative import instead"
            }
          ]
        }
      ]
    }
  }
];
