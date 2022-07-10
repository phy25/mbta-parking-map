const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
    entry: {
        index: './src/index.js',
    },
    devServer: {
        static: './dist',
    },
    module: {
        rules: [
            {
                test: /\.json\.js$/i,
                use: ["val-loader"],
                type: 'asset/resource',
                generator: {
                    filename: data => {
                        let origName = path.basename(data.filename);
                        let lastExtPos = origName.lastIndexOf('.');
                        let fileNameWithExt = origName.substr(0, lastExtPos);
                        let last2ExtPos = fileNameWithExt.lastIndexOf('.');
                        let ext = fileNameWithExt.substr(last2ExtPos);
                        let fileName = fileNameWithExt.substr(0, last2ExtPos);
                        return fileName + '.' + data.contentHash + ext;
                    },
                },
            },
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
            {
                test: /\.png$/i,
                type: 'asset/resource',
            },
        ],
    },
    output: {
        hashDigestLength: 8,
        assetModuleFilename: '[name].[contenthash][ext]',
        filename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "[name].[contenthash].css",
        }),
        new HtmlWebpackPlugin({
            title: 'MBTA Parking Map',
            template: 'src/index.ejs.html',
            favicon: 'src/icon.png',
            meta: {
                'viewport': 'width=device-width',
            },
            scriptLoading: 'blocking',
            inject: 'body',
            xhtml: true,
        })
    ],
    optimization: {
        minimizer: [
            "...",
            new ImageMinimizerPlugin({
                minimizer: {
                    implementation: ImageMinimizerPlugin.squooshMinify,
                    options: {
                    },
                },
            }),
            new CssMinimizerPlugin(),
        ],
    },
};