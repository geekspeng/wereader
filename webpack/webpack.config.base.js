const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const cssLoaders = [
    "style-loader",
    "css-loader",
    {
        loader: "postcss-loader",
        options: {
            postcssOptions: {
                plugins: [
                    [
                        "postcss-preset-env",
                        {
                            browsers: 'last 2 versions'
                        }
                    ]
                ]
            }
        }
    }
]

const lessLoaders = cssLoaders.concat(["less-loader"])

const babelLoader = {
    loader: "babel-loader",
    options: {
        presets: [
            [
                "@babel/preset-env",
                {
                    targets: "defaults",
                    corejs: "3",
                    useBuiltIns: "usage"
                }
            ]
        ]
    }
}

module.exports = {
    entry: {
        content: path.resolve(__dirname, "..", "src", "content.ts"),
    },

    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: "[name].js"
    },

    resolve: {
        extensions: [".ts", ".js", ".tsx"],
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/i,
                use: [
                    babelLoader,
                    'ts-loader'
                ],
                exclude: /node-modules/
            },
            {
                test: /\.less$/i,
                use: lessLoaders
            },
            {
                test: /\.css$/i,
                use: cssLoaders
            },
        ]
    },

    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                { from: "manifest.json", to: ".", context: "public" },
                { from: "extension-icons", to: "./icons/extension-icons", context: "public" },
                { from: "content/static/css", to: "./content/static/css", context: "src" },
            ]
        }),
    ]
}
