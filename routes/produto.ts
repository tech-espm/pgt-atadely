import express = require("express");
import wrap = require("express-async-error-wrapper");
import Usuario = require("../models/usuario");
import Produto = require("../models/produto");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		res.render("produto/alterar", {
			titulo: "Criar Produto",
			usuario: u,
			tamanhoMaximoMiniaturaEmKiB: Produto.tamanhoMaximoMiniaturaEmKiB,
			tamanhoMaximoImagemEmKiB: Produto.tamanhoMaximoImagemEmKiB,
			item: null
		});
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		let id = parseInt(req.query["id"]);
		let item: Produto = null;
		if (isNaN(id) || !(item = await Produto.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("produto/alterar", {
				titulo: "Editar Produto",
				usuario: u,
				tamanhoMaximoMiniaturaEmKiB: Produto.tamanhoMaximoMiniaturaEmKiB,
				tamanhoMaximoImagemEmKiB: Produto.tamanhoMaximoImagemEmKiB,	
				item: item
			});
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		res.render("produto/listar", {
			titulo: "Gerenciar Produtos",
			usuario: u,
			caminhoRelativoExternoMiniatura: Produto.caminhoRelativoExternoMiniatura,
			extensaoMiniatura: Produto.extensaoMiniatura,
			caminhoRelativoExternoImagem: Produto.caminhoRelativoExternoImagem,
			extensaoImagem: Produto.extensaoImagem,
			lista: JSON.stringify(await Produto.listar())
		});
	}
}));

export = router;
