import express = require("express");
import multer = require("multer");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Produto = require("../../models/produto");
import Usuario = require("../../models/usuario");

const router = express.Router();

function obterArquivo(req: express.Request, nome: string): any {
	return req["files"] && req["files"][nome] && req["files"][nome][0];
}

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!
router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	res.json(await Produto.listar());
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	res.json(isNaN(id) ? null : await Produto.obter(id));
}));

router.post("/criar", multer().fields([{ name: "miniatura" }, { name: "imagem" }]), wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let p = req.body as Produto;
	if (p) {
		p.valor = parseFloat((req.body.valor || "").replace(',', '.'));
	}
	jsonRes(res, 400, p ? await Produto.criar(p, obterArquivo(req, "miniatura"), obterArquivo(req, "imagem")) : "Dados inválidos");
}));

router.post("/alterar", multer().fields([{ name: "miniatura" }, { name: "imagem" }]), wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let p = req.body as Produto;
	if (p) {
		p.id = parseInt(req.body.id);
		p.valor = parseFloat((req.body.valor || "").replace(',', '.'));
	}
	jsonRes(res, 400, (p && !isNaN(p.id)) ? await Produto.alterar(p, obterArquivo(req, "miniatura"), obterArquivo(req, "imagem")) : "Dados inválidos");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos" : await Produto.excluir(id));
}));

export = router;
