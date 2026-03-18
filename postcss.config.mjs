import cssnano from "cssnano";
import postcssPresetEnv from "postcss-preset-env";
import postcssNesting from "postcss-nesting";
import postcssCustomProperties from "postcss-custom-properties";
import postcssDiscardDuplicates from "postcss-discard-duplicates";

export default {
  plugins: [
    postcssNesting(),
    postcssCustomProperties(),
    postcssDiscardDuplicates(),
    postcssPresetEnv({
      stage: 1,
      features: {
        'nesting-rules': false,
        'relative-color-syntax': false
      }
    }),
    cssnano({
      preset: ["default", {
        discardComments: {
          removeAll: true,
        },
        normalizeWhitespace: true,
        reduceIdents: false,
        colormin: false
      }]
    })
  ]
}
