import Sql = require("../infra/sql");
import FS = require("../infra/fs");
import Upload = require("../infra/upload");

export = class Produto {
	public static readonly tamanhoMaximoMiniaturaEmKiB = 50;
	public static readonly tamanhoMaximoMiniaturaEmBytes = Produto.tamanhoMaximoMiniaturaEmKiB << 10;
	public static readonly caminhoRelativoExternoMiniatura = "dados/produtos/miniaturas";
	public static readonly caminhoRelativoPastaMiniatura = "public/" + Produto.caminhoRelativoExternoMiniatura;
	public static readonly extensaoMiniatura = "jpg";

	public static readonly tamanhoMaximoImagemEmKiB = 300;
	public static readonly tamanhoMaximoImagemEmBytes = Produto.tamanhoMaximoImagemEmKiB << 10;
	public static readonly caminhoRelativoExternoImagem = "dados/produtos/imagens";
	public static readonly caminhoRelativoPastaImagem = "public/" + Produto.caminhoRelativoExternoImagem;
	public static readonly extensaoImagem = "jpg";

	public id: number;
	public nome: string;
	public descricao: string;
	public valor: number;
	public versao: number;

	private static caminhoRelativoMiniatura(id: number): string {
		return `${Produto.caminhoRelativoPastaMiniatura}/${id}.${Produto.extensaoMiniatura}`;
	}

	private static caminhoRelativoImagem(id: number): string {
		return `${Produto.caminhoRelativoPastaImagem}/${id}.${Produto.extensaoImagem}`;
	}

	private static validar(p: Produto): string {
		p.nome = (p.nome || "").normalize().trim();
		if (p.nome.length < 3 || p.nome.length > 100)
			return "Nome inválido";

		p.descricao = (p.descricao || "").normalize().trim();
		if (p.descricao.length > 200)
			return "Descrição inválida";

		if (isNaN(p.valor) || p.valor < 0)
			return "Valor inválido";

		return null;
	}
	
	private static validarArquivoMiniatura(arquivo: any): boolean {
		return (!arquivo || (arquivo.buffer && arquivo.size && arquivo.size <= Produto.tamanhoMaximoMiniaturaEmBytes));
	}

	private static validarArquivoImagem(arquivo: any): boolean {
		return (!arquivo || (arquivo.buffer && arquivo.size && arquivo.size <= Produto.tamanhoMaximoImagemEmBytes));
	}
	
	public static async listar(): Promise<Produto[]> {
		let lista: Produto[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select id, nome, descricao, valor, versao from produto")) as Produto[];
		});

		return lista || [];
	}

	public static async obter(id: number): Promise<Produto> {
		let lista: Produto[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select id, nome, descricao, valor, versao from produto where id = ?", [id])) as Produto[];
		});

		return (lista && lista[0]) || null;
	}

	public static async criar(p: Produto, arquivoMiniatura: any, arquivoImagem: any): Promise<string> {
		let res: string;
		if ((res = Produto.validar(p)))
			return res;
		if (!arquivoMiniatura || !Produto.validarArquivoMiniatura(arquivoMiniatura))
			return "Miniatura inválida!";
		if (!arquivoImagem || !Produto.validarArquivoImagem(arquivoImagem))
			return "Imagem inválida!";

		await Sql.conectar(async (sql: Sql) => {
			await sql.beginTransaction();

			await sql.query(`insert into produto (nome, descricao, valor, versao) values (?, ?, ?, 0)`, [p.nome, p.descricao, p.valor]);
			p.id = await sql.scalar("select last_insert_id()") as number;

			// Chegando aqui, significa que a inclusão foi bem sucedida.
			// Logo, podemos tentar criar o arquivo físico. Se a criação do
			// arquivo não funcionar, uma exceção ocorrerá, e a transação será
			// desfeita, já que o método commit() não executará, e nossa classe
			// Sql já executa um rollback() por nós nesses casos.
			await Upload.gravarArquivo(arquivoMiniatura, Produto.caminhoRelativoPastaMiniatura, p.id + "." + Produto.extensaoMiniatura);
			await Upload.gravarArquivo(arquivoImagem, Produto.caminhoRelativoPastaImagem, p.id + "." + Produto.extensaoImagem);

			res = p.id.toString();

			await sql.commit();
		});

		return res;
	}

	public static async alterar(p: Produto, arquivoMiniatura: any, arquivoImagem: any): Promise<string> {
		let res: string;
		if ((res = Produto.validar(p)))
			return res;
		if (!Produto.validarArquivoMiniatura(arquivoMiniatura))
			return "Miniatura inválida!";
		if (!Produto.validarArquivoImagem(arquivoImagem))
			return "Imagem inválida!";

		await Sql.conectar(async (sql: Sql) => {
			await sql.beginTransaction();

			await sql.query("update produto set nome = ?, descricao = ?, valor = ?, versao = versao + 1 where id = ?", [p.nome, p.descricao, p.valor, p.id]);

			if (sql.linhasAfetadas) {
				// Chegando aqui, significa que a inclusão foi bem sucedida.
				// Logo, podemos tentar criar o arquivo físico. Se a criação do
				// arquivo não funcionar, uma exceção ocorrerá, e a transação será
				// desfeita, já que o método commit() não executará, e nossa classe
				// Sql já executa um rollback() por nós nesses casos.
				if (arquivoMiniatura)
					await Upload.gravarArquivo(arquivoMiniatura, Produto.caminhoRelativoPastaMiniatura, p.id + "." + Produto.extensaoMiniatura);
				if (arquivoImagem)
					await Upload.gravarArquivo(arquivoImagem, Produto.caminhoRelativoPastaImagem, p.id + "." + Produto.extensaoImagem);
			}

			res = sql.linhasAfetadas.toString();

			await sql.commit();
		});

		return res;
	}

	public static async excluir(id: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("delete from produto where id = ?", [id]);

			if (sql.linhasAfetadas) {
				// Chegando aqui, significa que a exclusão foi bem sucedida.
				// Logo, podemos tentar excluir o arquivo físico. Se a exclusão do
				// arquivo não funcionar, uma exceção ocorrerá, e a transação será
				// desfeita, já que o método commit() não executará, e nossa classe
				// Sql já executa um rollback() por nós nesses casos.
				let caminho = Produto.caminhoRelativoMiniatura(id);
				if (await FS.existeArquivo(caminho))
					await FS.excluirArquivo(caminho);
				caminho = Produto.caminhoRelativoImagem(id);
				if (await FS.existeArquivo(caminho))
					await FS.excluirArquivo(caminho);
			}

			res = sql.linhasAfetadas.toString();
		});

		return res;
	}
};
