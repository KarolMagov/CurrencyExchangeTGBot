import * as dotenv from "dotenv"
import { Telegraf, Markup } from "telegraf"
import JSONController from "./controller/JSONController.js"
import { CronJob } from "cron"
import _ from "lodash"
import { FLAGS } from "./constants/flags.js"
dotenv.config()

const bot = new Telegraf(process.env.BOT_TOKEN)
const JC = new JSONController()
const cronjob = new CronJob("0 18 * * *", () => {
    console.log("Данные обновлены!")
    JC.WriteParsedJson()
})
cronjob.start()

try {
    //COMMAND START
    bot.command("start", (ctx) => {
        ctx.reply(`Привет, ${ctx.message.from.first_name}. Чтобы узнать курс валюты, введите команду \'Курс валют\' `, Markup.keyboard([["Курс валют"]]).resize())
    })
    //COMMAND END

    //HEARS START
    bot.hears("Курс валют", async (ctx) => {
        await ctx.reply("Выберите тип валюты 💶:", Markup.inlineKeyboard(_.chunk(JC.ReadParsedJson().map(e => {
            return Markup.button.callback(e.base + FLAGS[e.base], e.base)
        }), 3)))
    })

    //HEARS END

    //ACTION START
    bot.action(JC.ReadParsedJson().map(e => e.base), async (ctx) => {
        await ctx.editMessageText(`Вы выбрали ${ctx.update.callback_query.data + FLAGS[ctx.update.callback_query.data]}. Выберите валюту для сравнения 💵`, Markup.inlineKeyboard(_.chunk(Object.keys(JC.ReadParsedJson()?.[0]?.rates || []).map(e => {
            return Markup.button.callback(e + FLAGS[e], e + "1" + " " + ctx.update.callback_query.data)
        }), 3)))
    })
    bot.action(new RegExp(`\\b(${Object.keys(JC.ReadParsedJson()?.[0]?.rates || []).map(e => e + "1").join("|")})\\b`, "g"), async (ctx) => {
        let rate = ctx.update.callback_query.data.replace(/\d/g, "").split(" ")[0]
        let base = ctx.update.callback_query.data.replace(/\d/g, "").split(" ")[1]
        await ctx.editMessageText(`Курс валюты на ${JC.ReadParsedJson().find(f => f.base = base).date}.\n\nКурс ${base}${FLAGS[base] || ""} -> ${rate}${FLAGS[rate] || ""}: 1 к ${JC.ReadParsedJson().find(f => f.base == base).rates[rate]}\n`, Markup.inlineKeyboard([
            Markup.button.callback("Поменять местами🔁", `swap,${base},${rate}`)
        ]))
    })
    bot.action(new RegExp(`\\b(swap)\\b`, "g"), async (ctx) => {
        let base = ctx.update.callback_query.data.split(",")[1]
        let rate = ctx.update.callback_query.data.split(",")[2]
        await ctx.editMessageText(`Курс валюты на ${JC.ReadParsedJson().find(f => f.base = base).date}.\n\nКурс ${rate}${FLAGS[rate] || ""} -> ${base}${FLAGS[base] || ""}: 1 к ${(1 / JC.ReadParsedJson().find(f => f.base == base).rates[rate]).toFixed(6).replace(/\.?0*$\b/g, "")}\n`, Markup.inlineKeyboard([
            Markup.button.callback("Поменять местами🔁", `swap2,${base},${rate}`)
        ]))
    })
    bot.action(new RegExp(`\\b(swap2)\\b`, "g"), async (ctx) => {
        let base = ctx.update.callback_query.data.split(",")[1]
        let rate = ctx.update.callback_query.data.split(",")[2]
        await ctx.editMessageText(`Курс валюты на ${JC.ReadParsedJson().find(f => f.base = base).date}.\n\nКурс ${base}${FLAGS[base] || ""} -> ${rate}${FLAGS[rate] || ""}: 1 к ${JC.ReadParsedJson().find(f => f.base == base).rates[rate]}\n`, Markup.inlineKeyboard([
            Markup.button.callback("Поменять местами🔁", `swap,${base},${rate}`)
        ]))
    })
    //ACTION END

    //LISTENER ON START
    bot.on("text", (ctx) => {
        ctx.sendMessage("Чтобы узнать курс валюты, введите команду \'Курс валют\'")
    })
    //LISTENER ON END

    //LAUNCH
    bot.launch().then(console.log("Бот активен!"));

} catch (err) {
    console.error("Произошла ошибка!", err)
}
